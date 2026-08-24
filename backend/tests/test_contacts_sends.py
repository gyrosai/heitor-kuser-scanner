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

from app.db_models import EmailLog, ScannedContact
from app.routers.scan import list_contact_sends, list_contacts


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


def _db_for_list_contacts(contact_rows, logs):
    """db.execute é chamado 2x: (1) query de contatos, (2) query de email_logs."""
    contacts_result = MagicMock()
    contacts_result.all.return_value = contact_rows

    logs_result = MagicMock()
    logs_result.scalars.return_value.all.return_value = logs

    db = AsyncMock()
    db.execute = AsyncMock(side_effect=[contacts_result, logs_result])
    return db


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
    # só 1 chamada (contatos); sem contact_ids, não deveria nem consultar email_logs
    assert db.execute.await_count == 1


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
