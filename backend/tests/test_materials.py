"""Testes da biblioteca de materiais e importação por CSV.

Isolados de scan.py (sintaxe union 3.10+) e de zbar: importam só o router de
materiais, os models e a app mínima. Usam SQLite async em memória (aiosqlite).

Rodar com:
    cd backend && \
      DYLD_LIBRARY_PATH=/opt/homebrew/lib venv/bin/python -m pytest tests/test_materials.py -v
"""
from __future__ import annotations

import io
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base, get_db
from app.db_models import Material, MessageTemplate
from app.routers import materials as materials_router

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"X-Admin-Token": ADMIN_TOKEN}


# ── CSV de fixture (layout do Henrique) ─────────────────────────────────────
CSV_HEADER = (
    "produto,grupo,item,tipo,idioma,url,texto,data,local,ordem,status,observacao\n"
)

CSV_SAMPLE = CSV_HEADER + (
    # link ativo
    "CIMI360,Institucional,Mídia Kit PT,link,PT,https://example.com/kit-pt,,,,1,ok,\n"
    # link ativo idioma ENG
    "CIMI360,Institucional,Mídia Kit ENG,link,ENG,https://example.com/kit-en,,,,2,ok,\n"
    # link SEM url → inativo
    "CIMI360,Vídeo,Aftermovie,link,,,,,,3,ok,falta url\n"
    # texto → template
    "CIMI Invest,Texto,Texto padrão,texto,,,Olá {primeiro_nome} sobre {produto},,,1,ok,\n"
    # evento com data/local
    "INDIP,Missões Comerciais,Missão Dubai,evento,,https://example.com/dubai,,2026-10-01,Dubai,1,ok,\n"
    # produto Leilão → deve ser reconhecido (product_key=leilao)
    "Leilão,Institucional,Edital Leilão,link,,https://example.com/edital,,,,1,ok,\n"
    # produto desconhecido → erro de linha
    "Produto Inexistente,Grupo,Item,link,,https://example.com/x,,,,1,ok,\n"
    # status != ok → inativo mesmo com url
    "Feirão dos Corretores,MOU,Modelo MOU,link,,https://example.com/mou,,,,5,rascunho,\n"
)


@pytest_asyncio.fixture
async def client(monkeypatch) -> AsyncIterator[AsyncClient]:
    from fastapi import FastAPI

    monkeypatch.setattr(settings, "ADMIN_TOKEN", ADMIN_TOKEN)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(
            Base.metadata.create_all,
            tables=[Material.__table__, MessageTemplate.__table__],
        )
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app = FastAPI()
    app.include_router(materials_router.router)
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await engine.dispose()


def _csv_upload(content: str) -> dict:
    return {"file": ("materiais.csv", io.BytesIO(content.encode("utf-8")), "text/csv")}


# ═══════════════════════════════════════════════════════════════════════════
# Autenticação admin
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_admin_import_without_token_returns_401(client: AsyncClient):
    resp = await client.post(
        "/api/admin/materials/import-csv", files=_csv_upload(CSV_SAMPLE)
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_import_wrong_token_returns_401(client: AsyncClient):
    resp = await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers={"X-Admin-Token": "errado"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_list_without_token_returns_401(client: AsyncClient):
    resp = await client.get("/api/admin/materials")
    assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════
# Import: dry_run, criação, idempotência
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_dry_run_does_not_persist(client: AsyncClient):
    resp = await client.post(
        "/api/admin/materials/import-csv?dry_run=true",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["dry_run"] is True
    assert body["created"] >= 1

    # Nada foi gravado: admin list vazio.
    listing = await client.get("/api/admin/materials", headers=ADMIN_HEADERS)
    assert listing.json()["materials"] == []


@pytest.mark.asyncio
async def test_real_import_creates(client: AsyncClient):
    resp = await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200
    body = resp.json()
    # 6 materiais (2 links ok, 1 link sem url, 1 evento, 1 leilão, 1 feirao inativo)
    # criados + 1 template. Produto desconhecido vai para errors.
    assert body["created"] == 7
    assert body["updated"] == 0

    listing = (await client.get("/api/admin/materials", headers=ADMIN_HEADERS)).json()
    assert len(listing["materials"]) == 6  # templates não aparecem aqui


@pytest.mark.asyncio
async def test_reimport_is_idempotent(client: AsyncClient):
    first = (
        await client.post(
            "/api/admin/materials/import-csv",
            files=_csv_upload(CSV_SAMPLE),
            headers=ADMIN_HEADERS,
        )
    ).json()
    assert first["created"] == 7

    second = (
        await client.post(
            "/api/admin/materials/import-csv",
            files=_csv_upload(CSV_SAMPLE),
            headers=ADMIN_HEADERS,
        )
    ).json()
    assert second["created"] == 0
    assert second["updated"] == 7


# ═══════════════════════════════════════════════════════════════════════════
# Regras de conteúdo: erros, inativos, templates, eventos
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_unknown_product_goes_to_errors_rest_persists(client: AsyncClient):
    body = (
        await client.post(
            "/api/admin/materials/import-csv",
            files=_csv_upload(CSV_SAMPLE),
            headers=ADMIN_HEADERS,
        )
    ).json()
    reasons = " ".join(e["reason"] for e in body["errors"])
    assert "produto desconhecido" in reasons
    # o resto foi gravado
    assert body["created"] == 7


@pytest.mark.asyncio
async def test_leilao_product_is_recognized(client: AsyncClient):
    """produto=Leilão deve virar product_key='leilao', não cair em 'produto desconhecido'."""
    body = (
        await client.post(
            "/api/admin/materials/import-csv",
            files=_csv_upload(CSV_SAMPLE),
            headers=ADMIN_HEADERS,
        )
    ).json()
    reasons = " ".join(e["reason"] for e in body["errors"])
    assert "Leilão" not in reasons

    listing = (await client.get("/api/admin/materials", headers=ADMIN_HEADERS)).json()
    leilao_items = [m for m in listing["materials"] if m["product_key"] == "leilao"]
    assert len(leilao_items) == 1
    assert leilao_items[0]["label"] == "Edital Leilão"

    public = (await client.get("/api/materials")).json()
    keys = [p["key"] for p in public["products"]]
    assert "leilao" in keys
    # ordem canônica: leilao entre cimi_360 e indip
    assert keys.index("cimi_360") < keys.index("leilao") < keys.index("indip")


@pytest.mark.asyncio
async def test_item_without_url_is_inactive_and_hidden(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    public = (await client.get("/api/materials")).json()

    # Coleta labels ativos expostos publicamente.
    active_labels = {
        item["label"]
        for p in public["products"]
        for g in p["groups"]
        for item in g["items"]
    }
    assert "Mídia Kit PT" in active_labels
    assert "Aftermovie" not in active_labels  # sem url → inativo
    assert "Modelo MOU" not in active_labels  # status != ok → inativo


@pytest.mark.asyncio
async def test_texto_becomes_template(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    templates = (await client.get("/api/templates")).json()["templates"]
    assert len(templates) == 1
    t = templates[0]
    assert t["product_key"] == "cimi_invest"
    assert t["name"] == "Texto padrão"
    assert "{primeiro_nome}" in t["body"]


@pytest.mark.asyncio
async def test_evento_stores_meta(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    listing = (await client.get("/api/admin/materials", headers=ADMIN_HEADERS)).json()
    evento = next(m for m in listing["materials"] if m["kind"] == "evento")
    assert evento["meta"] == {"date": "2026-10-01", "location": "Dubai"}


@pytest.mark.asyncio
async def test_public_materials_grouped_and_ordered(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    public = (await client.get("/api/materials")).json()
    keys = [p["key"] for p in public["products"]]
    # ordem canônica: cimi_360 antes de indip
    assert keys.index("cimi_360") < keys.index("indip")

    cimi = next(p for p in public["products"] if p["key"] == "cimi_360")
    assert cimi["label"] == "CIMI 360"
    inst = next(g for g in cimi["groups"] if g["name"] == "Institucional")
    orders = [i["sort_order"] for i in inst["items"]]
    assert orders == sorted(orders)


@pytest.mark.asyncio
async def test_materials_endpoint_has_cache_header(client: AsyncClient):
    resp = await client.get("/api/materials")
    assert resp.headers.get("cache-control") == "public, max-age=120"


# ═══════════════════════════════════════════════════════════════════════════
# PATCH admin
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_patch_material_toggles_active(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    listing = (await client.get("/api/admin/materials", headers=ADMIN_HEADERS)).json()
    inactive = next(m for m in listing["materials"] if not m["active"])

    resp = await client.patch(
        f"/api/admin/materials/{inactive['id']}",
        json={"active": True, "url": "https://example.com/fixed"},
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 200
    assert resp.json()["active"] is True
    assert resp.json()["url"] == "https://example.com/fixed"


@pytest.mark.asyncio
async def test_patch_rejects_bad_url(client: AsyncClient):
    await client.post(
        "/api/admin/materials/import-csv",
        files=_csv_upload(CSV_SAMPLE),
        headers=ADMIN_HEADERS,
    )
    listing = (await client.get("/api/admin/materials", headers=ADMIN_HEADERS)).json()
    mid = listing["materials"][0]["id"]
    resp = await client.patch(
        f"/api/admin/materials/{mid}",
        json={"url": "ftp://nope"},
        headers=ADMIN_HEADERS,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_bad_url_in_csv_goes_to_errors(client: AsyncClient):
    bad = CSV_HEADER + "CIMI360,Grupo,Item,link,,ftp://nope,,,,1,ok,\n"
    body = (
        await client.post(
            "/api/admin/materials/import-csv",
            files=_csv_upload(bad),
            headers=ADMIN_HEADERS,
        )
    ).json()
    assert body["created"] == 0
    assert any("http" in e["reason"] for e in body["errors"])
