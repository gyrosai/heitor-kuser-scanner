"""Biblioteca de materiais e templates de mensagem.

Público:
    GET /api/materials  → materiais ativos agrupados por produto/grupo.
    GET /api/templates  → templates ativos por produto.

Administrativo (header X-Admin-Token):
    POST  /api/admin/materials/import-csv  (?dry_run=true)
    PATCH /api/admin/materials/{id}
    GET   /api/admin/materials             (inclui inativos)

A administração é feita por importação de CSV (layout do Henrique); a tela do
app é só de consulta.
"""
from __future__ import annotations

import csv
import io
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi import File as FileParam
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.database import get_db
from app.db_models import Material, MessageTemplate
from app.dependencies import require_admin_token
from app.materials_catalog import (
    PRODUCTS_ORDER,
    normalize_product_key,
    product_label,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# ── Constantes de validação ─────────────────────────────────────────────────
VALID_KINDS = {"link", "texto", "evento"}
VALID_LANGUAGES = {"PT", "ENG", "ESP"}  # além de None
DEFAULT_TEMPLATE_NAME = "Texto padrão"

# Colunas esperadas no CSV (ordem não importa; casamos por header).
CSV_COLUMNS = [
    "produto",
    "grupo",
    "item",
    "tipo",
    "idioma",
    "url",
    "texto",
    "data",
    "local",
    "ordem",
    "status",
    "observacao",
]


# ═══════════════════════════════════════════════════════════════════════════
# Parser de CSV → registros normalizados
# ═══════════════════════════════════════════════════════════════════════════


class ParsedRow:
    """Uma linha de CSV normalizada e validada, pronta para upsert."""

    __slots__ = (
        "active",
        "group_name",
        "kind",
        "label",
        "language",
        "line",
        "meta",
        "notes",
        "product_key",
        "sort_order",
        "text",
        "url",
    )

    def __init__(self, **kw: Any) -> None:
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _normalize_language(raw: str) -> str | None:
    """"" → None; PT/ENG/ESP mantidos (uppercased). Aceita 'pt'/'eng'/'esp'."""
    v = raw.strip().upper()
    if not v:
        return None
    return v


def _parse_sort_order(raw: str) -> int:
    v = raw.strip()
    if not v:
        return 0
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return 0


def parse_csv(content: bytes) -> tuple[list[ParsedRow], list[dict[str, Any]]]:
    """Parseia o CSV do Henrique. Retorna (linhas_válidas, erros).

    Cada erro é {"line": n, "reason": str}. Um erro de linha nunca aborta o
    arquivo — o resto continua. Erros de estrutura (header ausente) levantam
    ValueError.
    """
    # UTF-8 com BOM → utf-8-sig remove o BOM automaticamente.
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV vazio ou sem cabeçalho")

    headers = {h.strip().lower() for h in reader.fieldnames if h}
    missing = [c for c in ("produto", "grupo", "item", "tipo") if c not in headers]
    if missing:
        raise ValueError(f"CSV sem colunas obrigatórias: {', '.join(missing)}")

    rows: list[ParsedRow] = []
    errors: list[dict[str, Any]] = []

    # DictReader começa na linha 2 do arquivo (linha 1 = header).
    for offset, raw_row in enumerate(reader, start=2):
        # normaliza chaves para lower()
        row = {(k or "").strip().lower(): v for k, v in raw_row.items()}

        produto = _clean(row.get("produto"))
        grupo = _clean(row.get("grupo"))
        item = _clean(row.get("item"))
        tipo = _clean(row.get("tipo")).lower()

        # Linha totalmente vazia → ignora silenciosamente (não é erro nem skip).
        if not any([produto, grupo, item, tipo]):
            continue

        product_key = normalize_product_key(produto)
        if product_key is None:
            errors.append(
                {"line": offset, "reason": f"produto desconhecido: '{produto}'"}
            )
            continue

        if tipo not in VALID_KINDS:
            errors.append(
                {"line": offset, "reason": f"tipo inválido: '{tipo}'"}
            )
            continue

        if not grupo or not item:
            errors.append(
                {"line": offset, "reason": "grupo e item são obrigatórios"}
            )
            continue

        language = _normalize_language(_clean(row.get("idioma")))
        if language is not None and language not in VALID_LANGUAGES:
            errors.append(
                {"line": offset, "reason": f"idioma inválido: '{language}'"}
            )
            continue

        url = _clean(row.get("url"))
        text = _clean(row.get("texto"))
        status = _clean(row.get("status")).lower()
        sort_order = _parse_sort_order(_clean(row.get("ordem")))
        notes = _clean(row.get("observacao")) or None

        # url, quando presente, precisa ser http(s)://
        if url and not (url.startswith("http://") or url.startswith("https://")):
            errors.append(
                {"line": offset, "reason": f"url deve começar com http(s)://: '{url}'"}
            )
            continue

        if tipo == "texto":
            # Vira message_template. active = status ok E texto não vazio.
            active = status == "ok" and bool(text)
            rows.append(
                ParsedRow(
                    line=offset,
                    product_key=product_key,
                    group_name=grupo,
                    label=item,
                    kind="texto",
                    language=language,
                    url=None,
                    text=text,
                    meta={},
                    sort_order=sort_order,
                    active=active,
                    notes=notes,
                )
            )
            continue

        # tipo link | evento → material. active = status ok E url não vazio.
        active = status == "ok" and bool(url)
        meta: dict[str, Any] = {}
        if tipo == "evento":
            data = _clean(row.get("data"))
            local = _clean(row.get("local"))
            if data:
                meta["date"] = data
            if local:
                meta["location"] = local

        rows.append(
            ParsedRow(
                line=offset,
                product_key=product_key,
                group_name=grupo,
                label=item,
                kind=tipo,
                language=language,
                url=url or None,
                text=None,
                meta=meta,
                sort_order=sort_order,
                active=active,
                notes=notes,
            )
        )

    return rows, errors


# ═══════════════════════════════════════════════════════════════════════════
# Upsert idempotente
# ═══════════════════════════════════════════════════════════════════════════


async def _find_material(db, product_key: str, group_name: str, label: str, language):
    """Busca material pela identidade única, tratando language NULL explicitamente
    (Postgres considera NULL distinto em UNIQUE, então não confiamos no constraint)."""
    stmt = select(Material).where(
        Material.product_key == product_key,
        Material.group_name == group_name,
        Material.label == label,
    )
    if language is None:
        stmt = stmt.where(Material.language.is_(None))
    else:
        stmt = stmt.where(Material.language == language)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _upsert_material(db, row: ParsedRow) -> str:
    """Cria ou atualiza um material. Retorna 'created' ou 'updated'."""
    existing = await _find_material(
        db, row.product_key, row.group_name, row.label, row.language
    )
    if existing is None:
        db.add(
            Material(
                product_key=row.product_key,
                group_name=row.group_name,
                label=row.label,
                kind=row.kind,
                language=row.language,
                url=row.url,
                meta=row.meta or {},
                sort_order=row.sort_order,
                active=row.active,
                notes=row.notes,
            )
        )
        return "created"

    existing.kind = row.kind
    existing.url = row.url
    existing.meta = row.meta or {}
    existing.sort_order = row.sort_order
    existing.active = row.active
    existing.notes = row.notes
    return "updated"


async def _upsert_template(db, row: ParsedRow) -> str:
    """Cria ou atualiza um message_template (name fixo 'Texto padrão')."""
    result = await db.execute(
        select(MessageTemplate).where(
            MessageTemplate.product_key == row.product_key,
            MessageTemplate.name == DEFAULT_TEMPLATE_NAME,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is None:
        db.add(
            MessageTemplate(
                product_key=row.product_key,
                name=DEFAULT_TEMPLATE_NAME,
                body=row.text or "",
                active=row.active,
            )
        )
        return "created"

    existing.body = row.text or ""
    existing.active = row.active
    return "updated"


# ═══════════════════════════════════════════════════════════════════════════
# Endpoints públicos
# ═══════════════════════════════════════════════════════════════════════════


def _material_item(m: Material) -> dict[str, Any]:
    return {
        "id": m.id,
        "label": m.label,
        "kind": m.kind,
        "language": m.language,
        "url": m.url,
        "meta": m.meta or {},
        "sort_order": m.sort_order,
    }


@router.get("/materials")
async def list_materials(db=Depends(get_db)):
    """Materiais ATIVOS agrupados por produto → grupo, ordenados por sort_order."""
    if db is None:
        return JSONResponse(
            content={"products": []},
            headers={"Cache-Control": "public, max-age=120"},
        )

    result = await db.execute(
        select(Material)
        .where(Material.active.is_(True))
        .order_by(Material.sort_order, Material.id)
    )
    materials = result.scalars().all()

    # Agrupa preservando a ordem canônica de produtos e a ordem de sort_order.
    by_product: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for m in materials:
        by_product.setdefault(m.product_key, {}).setdefault(m.group_name, []).append(
            _material_item(m)
        )

    products_out: list[dict[str, Any]] = []
    ordered_keys = [k for k in PRODUCTS_ORDER if k in by_product]
    # produtos fora da ordem canônica (defensivo) vão ao final, em ordem alfabética
    ordered_keys += sorted(k for k in by_product if k not in PRODUCTS_ORDER)

    for key in ordered_keys:
        groups = by_product[key]
        products_out.append(
            {
                "key": key,
                "label": product_label(key),
                "groups": [
                    {"name": name, "items": items}
                    for name, items in groups.items()
                ],
            }
        )

    return JSONResponse(
        content={"products": products_out},
        headers={"Cache-Control": "public, max-age=120"},
    )


@router.get("/templates")
async def list_templates(db=Depends(get_db)):
    """Templates de mensagem ATIVOS por product_key."""
    if db is None:
        return JSONResponse(
            content={"templates": []},
            headers={"Cache-Control": "public, max-age=120"},
        )

    result = await db.execute(
        select(MessageTemplate)
        .where(MessageTemplate.active.is_(True))
        .order_by(MessageTemplate.product_key, MessageTemplate.id)
    )
    templates = result.scalars().all()
    return JSONResponse(
        content={
            "templates": [
                {
                    "id": t.id,
                    "product_key": t.product_key,
                    "name": t.name,
                    "body": t.body,
                }
                for t in templates
            ]
        },
        headers={"Cache-Control": "public, max-age=120"},
    )


# ═══════════════════════════════════════════════════════════════════════════
# Endpoints administrativos (X-Admin-Token)
# ═══════════════════════════════════════════════════════════════════════════


@router.post(
    "/admin/materials/import-csv", dependencies=[Depends(require_admin_token)]
)
async def import_csv(
    file: UploadFile = FileParam(...),
    dry_run: bool = Query(False),
    db=Depends(get_db),
):
    """Importa/atualiza materiais e templates a partir do CSV do Henrique.

    Idempotente: reimportar o mesmo CSV atualiza (não duplica). Com
    ?dry_run=true valida e reporta sem gravar nada.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    content = await file.read()
    try:
        rows, errors = parse_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    created = 0
    updated = 0
    skipped = 0

    for row in rows:
        try:
            if row.kind == "texto":
                action = await _upsert_template(db, row)
            else:
                action = await _upsert_material(db, row)
            if action == "created":
                created += 1
            else:
                updated += 1
        except Exception as exc:  # noqa: BLE001 — reporta por linha, não derruba
            skipped += 1
            errors.append({"line": row.line, "reason": f"erro ao gravar: {exc}"})

    if dry_run:
        # Autoflush garante que SELECTs viram inserts pendentes da mesma
        # importação, então os counts refletem o que SERIA gravado. O rollback
        # só descarta as escritas — os counts permanecem válidos.
        await db.rollback()
    else:
        await db.commit()

    return {
        "dry_run": dry_run,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }


@router.patch(
    "/admin/materials/{material_id}", dependencies=[Depends(require_admin_token)]
)
async def patch_material(material_id: int, payload: dict, db=Depends(get_db)):
    """Edita campos pontuais de um material: active, url, label, sort_order."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")
    if not payload:
        raise HTTPException(status_code=400, detail="Body vazio")

    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if material is None:
        raise HTTPException(status_code=404, detail="Material não encontrado")

    allowed = {"active", "url", "label", "sort_order"}
    changed = False
    for field, value in payload.items():
        if field not in allowed:
            continue
        if field == "url" and value:
            if not (str(value).startswith("http://") or str(value).startswith("https://")):
                raise HTTPException(
                    status_code=422, detail="url deve começar com http(s)://"
                )
        if field == "sort_order":
            try:
                value = int(value)
            except (ValueError, TypeError):
                raise HTTPException(status_code=422, detail="sort_order deve ser inteiro")
        if field == "active":
            value = bool(value)
        setattr(material, field, value)
        changed = True

    if not changed:
        raise HTTPException(status_code=400, detail="Nenhum campo válido enviado")

    await db.commit()
    await db.refresh(material)
    return {
        "id": material.id,
        "product_key": material.product_key,
        "group_name": material.group_name,
        "label": material.label,
        "kind": material.kind,
        "language": material.language,
        "url": material.url,
        "meta": material.meta or {},
        "sort_order": material.sort_order,
        "active": material.active,
        "notes": material.notes,
    }


@router.get("/admin/materials", dependencies=[Depends(require_admin_token)])
async def list_all_materials(db=Depends(get_db)):
    """Todos os materiais (inclusive inativos) para conferência administrativa."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    result = await db.execute(
        select(Material).order_by(
            Material.product_key, Material.group_name, Material.sort_order, Material.id
        )
    )
    materials = result.scalars().all()
    return {
        "materials": [
            {
                "id": m.id,
                "product_key": m.product_key,
                "group_name": m.group_name,
                "label": m.label,
                "kind": m.kind,
                "language": m.language,
                "url": m.url,
                "meta": m.meta or {},
                "sort_order": m.sort_order,
                "active": m.active,
                "notes": m.notes,
            }
            for m in materials
        ]
    }
