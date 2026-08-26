"""Testes de app.routers.scan: last_send em GET /api/contacts e o novo
GET /api/contacts/{id}/sends. Chamada direta das funções (sem TestClient)
com db mockado — ScannedContact/EmailLog usam ARRAY(String) do Postgres e
não podem ser criados via CREATE TABLE em SQLite (ver test_materials.py para
o padrão usado quando o dialect não importa).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_contacts_sends.py -v
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from fastapi import HTTPException

from app.db_models import EmailLog, ScannedContact
from app.models import ContactData
from app.routers.scan import (
    create_vcard,
    export_contacts_csv,
    list_contact_sends,
    list_contacts,
)


def _make_contact(id: int, **overrides) -> ScannedContact:
    c = ScannedContact()
    c.id = id
    c.name = f"Contato {id}"
    c.phone = None
    c.email = "lead@example.com"
    c.company = None
    c.role = None
    c.website = None
    c.notes = None
    c.source = "card_photo"
    c.event_tag = "CIMI2026"
    c.scanned_at = None
    c.importance = None
    c.tags = []
    c.is_draft = False
    c.updated_at = None
    c.email_language = "pt-BR"
    c.google_contact_id = None
    c.email_status = None
    c.email_sent_at = None
    c.email_error = None
    c.import_labels = []
    for k, v in overrides.items():
        setattr(c, k, v)
    return c


def _make_log(
    id: int,
    contact_id: int,
    channel: str = "email",
    product_key: str | None = None,
    status: str = "sent",
    sent_at=None,
) -> EmailLog:
    log = EmailLog()
    log.id = id
    log.contact_id = contact_id
    log.channel = channel
    log.product_key = product_key
    log.material_ids = []
    log.template_id = None
    log.idioma = "pt-BR"
    log.subject = "Assunto"
    log.status = status
    log.error_message = None
    log.created_at = None
    log.sent_at = sent_at
    return log


def _db_for_list_contacts(contact_rows, logs, include_imported=False):
    """Mocka db.execute na ordem chamada por list_contacts.

    - include_imported=False (contrato padrão/atual): (1) query de contatos,
      (2) query de email_logs — SEM count, pois o formato de retorno é uma
      lista simples e não precisa de total para paginação.
    - include_imported=True: (1) count, (2) query de contatos, (3) email_logs.
    """
    contacts_result = MagicMock()
    contacts_result.all.return_value = contact_rows

    logs_result = MagicMock()
    logs_result.scalars.return_value.all.return_value = logs

    side_effect = [contacts_result, logs_result]
    if include_imported:
        count_result = MagicMock()
        count_result.scalar.return_value = len(contact_rows)
        side_effect = [count_result, contacts_result, logs_result]

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=side_effect)
    return db


@pytest.mark.asyncio
async def test_list_contacts_default_returns_plain_array():
    """Contrato atual (sem include_imported): resposta é list[ContactRecord],
    não {"contacts": ..., "total": ...} — o frontend em produção depende
    disso hoje. Não pode regredir."""
    c1 = _make_contact(1)
    db = _db_for_list_contacts([(c1, False)], [])

    out = await list_contacts(db=db, tags=None)

    assert isinstance(out, list)
    assert out[0]["id"] == 1
    # sem include_imported: só 2 chamadas (contatos + email_logs), sem count
    assert db.execute.await_count == 2


@pytest.mark.asyncio
async def test_list_contacts_includes_last_send_for_each_contact():
    c1 = _make_contact(1)
    c2 = _make_contact(2)
    logs = [
        # contato 1: dois envios — o mais recente (id maior) deve prevalecer
        _make_log(10, contact_id=1, product_key="cimi_360", status="sent"),
        _make_log(9, contact_id=1, product_key=None, status="failed"),
        # contato 2: nenhum envio
    ]
    db = _db_for_list_contacts([(c1, False), (c2, False)], logs)

    out = await list_contacts(db=db, tags=None)

    by_id = {c["id"]: c for c in out}
    assert by_id[1]["last_send"] == {
        "channel": "email",
        "product_key": "cimi_360",
        "status": "sent",
        "sent_at": None,
    }
    assert by_id[2]["last_send"] is None


@pytest.mark.asyncio
async def test_list_contacts_no_contacts_skips_email_logs_query():
    db = _db_for_list_contacts([], [])
    out = await list_contacts(db=db, tags=None)
    assert out == []
    # só 1 chamada (contatos); sem contact_ids, não consulta email_logs
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_list_contacts_include_imported_returns_dict_with_total():
    """include_imported=true muda o contrato para {"contacts", "total"} —
    usado pelo toggle "Base Heitor" no frontend, que pagina via `limit`."""
    c1 = _make_contact(1, source="base_heitor")
    db = _db_for_list_contacts([(c1, False)], [], include_imported=True)

    out = await list_contacts(db=db, tags=None, include_imported=True, limit=200)

    assert out["total"] == 1
    assert out["contacts"][0]["id"] == 1
    # include_imported=true: 3 chamadas (count + contatos + email_logs)
    assert db.execute.await_count == 3


@pytest.mark.asyncio
async def test_list_contact_sends_returns_history_most_recent_first():
    now = datetime.now(timezone.utc)
    logs = [
        _make_log(20, contact_id=5, product_key="leilao", status="sent", sent_at=now),
        _make_log(19, contact_id=5, product_key=None, status="skipped"),
    ]
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = logs
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result_mock)

    out = await list_contact_sends(contact_id=5, db=db)

    assert [s["id"] for s in out["sends"]] == [20, 19]
    assert out["sends"][0]["product_key"] == "leilao"
    assert out["sends"][0]["status"] == "sent"
    assert out["sends"][1]["product_key"] is None
    assert out["sends"][1]["status"] == "skipped"


@pytest.mark.asyncio
async def test_list_contact_sends_empty_history():
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result_mock)

    out = await list_contact_sends(contact_id=999, db=db)
    assert out == {"sends": []}


@pytest.mark.asyncio
async def test_create_vcard_409_match_type_imported():
    """Ao salvar um contato cujo email/telefone já existe na base_heitor,
    o create_vcard levanta 409 com match_type='imported' — o frontend usa
    isso para mostrar 'Já está na base do Heitor' no DuplicateModal."""
    editing = _make_contact(1, email="lead@example.com", phone=None)
    imported = _make_contact(
        50, source="base_heitor", email="lead@example.com", phone=None
    )

    # 1ª execute: fetch do contato sendo editado (contact_id=1)
    fetch_result = MagicMock()
    fetch_result.scalar_one_or_none.return_value = editing
    # 2ª execute: dedup scanned (mesmo event_tag) → nada
    scanned_result = MagicMock()
    scanned_result.scalar_one_or_none.return_value = None
    # 3ª execute: dedup importados → encontra a base_heitor
    imported_result = MagicMock()
    imported_result.scalar_one_or_none.return_value = imported

    db = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[fetch_result, scanned_result, imported_result]
    )

    contact = ContactData(
        name="Lead", email="lead@example.com", event_tag="CIMI2026"
    )

    with pytest.raises(HTTPException) as exc:
        await create_vcard(
            contact=contact,
            background_tasks=MagicMock(),
            contact_id=1,
            force=False,
            db=db,
            current_user=MagicMock(email="op@cimi360.com.br"),
        )

    assert exc.value.status_code == 409
    assert exc.value.detail["match_type"] == "imported"
    assert exc.value.detail["existing_id"] == 50


@pytest.mark.asyncio
async def test_export_csv_excludes_base_heitor_and_has_new_columns():
    """O export.csv NÃO pode vazar a base importada (base_heitor) para o CSV
    de leads de campo, e precisa das colunas Produtos/Perfis/Evento."""
    c1 = _make_contact(1, event_tag="CIMI2026", tags=["cimi_360:stand", "leilao"])

    captured = {}

    async def fake_execute(stmt):
        captured["sql"] = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        result = MagicMock()
        result.all.return_value = [(c1, False)]
        return result

    db = AsyncMock()
    db.execute = fake_execute

    resp = await export_contacts_csv(db=db, tags=None)
    body = resp.body.decode("utf-8")

    # Filtro de exclusão dos importados foi para a query
    assert "base_heitor" in captured["sql"]
    # Colunas novas no cabeçalho
    assert "Produtos" in body
    assert "Perfis" in body
    assert "Evento" in body
    # Dado do contato de campo presente
    assert "CIMI2026" in body
