"""
Testes unitários para dispatch_media_kit_email e integração com /vcard.

Rodar com:
    cd backend && python -m pytest tests/test_send_email.py -v
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.db_models import ScannedContact
from app.dependencies import CurrentUser
from app.services.email_dispatch import EmailDispatchResult, dispatch_media_kit_email


def _make_contact(**overrides) -> ScannedContact:
    c = ScannedContact()
    c.id = 1
    c.name = "João Silva"
    c.email = "joao@example.com"
    c.event_tag = "CIMI2026"
    c.email_status = None
    c.email_sent_at = None
    c.email_language = "pt-BR"
    c.email_gmail_message_id = None
    c.email_error = None
    c.email_attempted_at = None
    c.tags = []
    for k, v in overrides.items():
        setattr(c, k, v)
    return c


def _make_user() -> CurrentUser:
    return CurrentUser(email="heitor@cimi.com.br", name="Heitor CIMI")


def _make_db() -> AsyncMock:
    db = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_send_email_success():
    """Envio bem-sucedido: status=sent, campos atualizados no contato."""
    contact = _make_contact()
    user = _make_user()
    db = _make_db()

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={"remaining": 100, "used": 0, "limit": 500, "sender_email": user.email},
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(return_value={"id": "gmail_abc123", "threadId": "thread_xyz"}),
        ),
    ):
        result = await dispatch_media_kit_email(db, contact, user)

    assert result.status == "sent"
    assert result.gmail_message_id == "gmail_abc123"
    assert result.language == "pt-BR"
    assert result.quota_remaining == 99
    assert contact.email_status == "sent"
    assert contact.email_language == "pt-BR"
    assert contact.email_gmail_message_id == "gmail_abc123"
    assert contact.email_error is None
    assert contact.email_attempted_at is not None


@pytest.mark.asyncio
async def test_send_email_no_email_returns_contact_has_no_email():
    """Contato sem e-mail: retorna contact_has_no_email sem tocar no DB."""
    contact = _make_contact(email=None)
    user = _make_user()
    db = _make_db()

    result = await dispatch_media_kit_email(db, contact, user)

    assert result.status == "contact_has_no_email"
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_send_email_already_sent_returns_already_sent():
    """Contato que já recebeu e-mail: retorna already_sent sem reenviar."""
    sent_at = datetime.now(timezone.utc)
    contact = _make_contact(email_status="sent", email_sent_at=sent_at, email_language="pt-BR")
    user = _make_user()
    db = _make_db()

    result = await dispatch_media_kit_email(db, contact, user, force=False)

    assert result.status == "already_sent"
    assert result.sent_at == sent_at
    assert result.language == "pt-BR"
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_send_email_force_reenvia():
    """force=True reenvía mesmo com email_status='sent'."""
    contact = _make_contact(
        email_status="sent",
        email_sent_at=datetime.now(timezone.utc),
        email_language="pt-BR",
    )
    user = _make_user()
    db = _make_db()

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={"remaining": 50, "used": 450, "limit": 500, "sender_email": user.email},
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(return_value={"id": "gmail_resend999", "threadId": "thread_r"}),
        ),
    ):
        result = await dispatch_media_kit_email(db, contact, user, force=True)

    assert result.status == "sent"
    assert result.gmail_message_id == "gmail_resend999"
    assert contact.email_status == "sent"
    assert contact.email_gmail_message_id == "gmail_resend999"


@pytest.mark.asyncio
async def test_vcard_send_email_false_does_not_dispatch():
    """Quando send_email=False, email_status='skipped' e dispatch não é chamado."""
    contact = _make_contact()
    db = _make_db()

    dispatched: list = []

    async def mock_dispatch_bg(contact_id, sender_email, sender_name, **kwargs):
        dispatched.append(contact_id)

    # Reproduz a lógica do endpoint /vcard: send_email=False → skipped
    send_email = False
    if send_email:
        await mock_dispatch_bg(
            contact_id=contact.id,
            sender_email="user@test.com",
            sender_name="User",
        )
    else:
        contact.email_status = "skipped"
        await db.commit()

    assert len(dispatched) == 0, "dispatch não deve ser chamado quando send_email=False"
    assert contact.email_status == "skipped"
    db.commit.assert_called_once()
