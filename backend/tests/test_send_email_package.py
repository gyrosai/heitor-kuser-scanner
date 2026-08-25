"""Testes do pacote de materiais em dispatch_media_kit_email (email_dispatch.py).

Cobre: composição via compose_package, sem anexo de PDF, registro estendido
em EmailLog (channel/product_key/material_ids/template_id/message_snapshot),
e a regra central de decisão B — falha na composição/envio do pacote NUNCA
propaga como exceção (sempre cai em email_status='failed' com erro legível).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_send_email_package.py -v
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db_models import Material, MessageTemplate, ScannedContact
from app.dependencies import CurrentUser
from app.models import PackageSelection
from app.services.email_dispatch import dispatch_media_kit_email


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


def _make_template(
    body: str = "Olá {primeiro_nome}, sobre {produto} no {evento}.",
    product_key: str = "cimi_360",
    template_id: int = 5,
) -> MessageTemplate:
    t = MessageTemplate()
    t.id = template_id
    t.product_key = product_key
    t.name = "Texto padrão"
    t.body = body
    t.active = True
    return t


def _make_material(
    id: int,
    label: str,
    url: str | None = "https://example.com/kit",
    language: str | None = None,
    active: bool = True,
    kind: str = "link",
    meta: dict | None = None,
    product_key: str = "cimi_360",
) -> Material:
    m = Material()
    m.id = id
    m.label = label
    m.url = url
    m.language = language
    m.active = active
    m.kind = kind
    m.meta = meta or {}
    m.product_key = product_key
    return m


def _query_result(*, first=None, all_=None):
    res = MagicMock()
    res.scalars.return_value.first.return_value = first
    res.scalars.return_value.all.return_value = all_ or []
    return res


def _make_db(*, template=None, materials=None) -> AsyncMock:
    """db mock: db.execute() é chamado 2x em ordem (template, materiais)."""
    db = AsyncMock()
    db.commit = AsyncMock()
    db.execute = AsyncMock(
        side_effect=[
            _query_result(first=template),
            _query_result(all_=materials or []),
        ]
    )
    return db


# ═══════════════════════════════════════════════════════════════════════════
# Caminho feliz: pacote enviado com sucesso
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_package_send_success_uses_compose_package_no_attachment():
    contact = _make_contact()
    user = _make_user()
    template = _make_template()
    materials = [
        _make_material(1, "Mídia Kit", url="https://x/kit"),
        _make_material(2, "Vídeo", url="https://x/video"),
    ]
    db = _make_db(template=template, materials=materials)
    package = PackageSelection(
        product_key="cimi_360", material_ids=[1, 2], template_id=5
    )

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={
                "remaining": 100,
                "used": 0,
                "limit": 500,
                "sender_email": user.email,
            },
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(return_value={"id": "gmail_pkg1", "threadId": "thread_pkg1"}),
        ) as mock_send,
    ):
        result = await dispatch_media_kit_email(db, contact, user, package=package)

    assert result.status == "sent"
    assert contact.email_status == "sent"

    # Nunca anexa PDF no pacote; body_html vem de compose_package.
    _, call_kwargs = mock_send.call_args
    assert call_kwargs["attach_media_kit"] is False
    assert call_kwargs["body_html"] is not None
    assert "Mídia Kit — https://x/kit" in call_kwargs["body_text"]
    assert "Vídeo — https://x/video" in call_kwargs["body_text"]

    # EmailLog gravado com os metadados do pacote.
    logged = db.add.call_args.args[0]
    assert logged.channel == "email"
    assert logged.product_key == "cimi_360"
    assert logged.material_ids == [1, 2]
    assert logged.template_id == 5
    assert logged.message_snapshot == call_kwargs["body_text"]
    assert logged.status == "sent"


@pytest.mark.asyncio
async def test_legacy_path_still_attaches_media_kit_when_no_package():
    """Regressão: sem package, comportamento 100% legado (com anexo)."""
    contact = _make_contact()
    user = _make_user()
    db = _make_db()

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={
                "remaining": 100,
                "used": 0,
                "limit": 500,
                "sender_email": user.email,
            },
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(
                return_value={"id": "gmail_legacy", "threadId": "thread_legacy"}
            ),
        ) as mock_send,
    ):
        result = await dispatch_media_kit_email(db, contact, user)

    assert result.status == "sent"
    _, call_kwargs = mock_send.call_args
    assert call_kwargs["attach_media_kit"] is True
    assert call_kwargs["body_html"] is None

    logged = db.add.call_args.args[0]
    assert logged.product_key is None
    assert logged.material_ids == []
    assert logged.template_id is None


# ═══════════════════════════════════════════════════════════════════════════
# Decisão B: falha no pacote NUNCA propaga — sempre email_status='failed'
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_missing_template_uses_generic_fallback_and_still_sends():
    """Produto sem template ativo: NUNCA impede o envio. compose_package usa
    o texto genérico embutido por idioma e o e-mail sai normalmente."""
    contact = _make_contact()
    user = _make_user()
    db = _make_db(template=None, materials=[])
    package = PackageSelection(product_key="cimi_invest", material_ids=[])

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={
                "remaining": 100,
                "used": 0,
                "limit": 500,
                "sender_email": user.email,
            },
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(
                return_value={"id": "gmail_fallback", "threadId": "thread_fallback"}
            ),
        ) as mock_send,
    ):
        result = await dispatch_media_kit_email(db, contact, user, package=package)

    assert result.status == "sent"
    assert contact.email_status == "sent"
    assert contact.email_error is None

    _, call_kwargs = mock_send.call_args
    assert "foi um prazer" in call_kwargs["body_text"]

    logged = db.add.call_args.args[0]
    assert logged.status == "sent"


@pytest.mark.asyncio
async def test_send_via_gmail_exception_never_raises_simulates_oauth_expired():
    """Simula OAuth expirado / Gmail indisponível durante o envio do pacote:
    dispatch_media_kit_email não deve levantar — deve retornar status=failed
    com erro legível, e o e-mail_status do contato refletir isso."""
    contact = _make_contact()
    user = _make_user()
    template = _make_template()
    materials = [_make_material(1, "Kit", url="https://x/kit")]
    db = _make_db(template=template, materials=materials)
    package = PackageSelection(product_key="cimi_360", material_ids=[1])

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={
                "remaining": 100,
                "used": 0,
                "limit": 500,
                "sender_email": user.email,
            },
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(
                side_effect=PermissionError(
                    "OAuth não autorizado para heitor@cimi.com.br"
                )
            ),
        ),
    ):
        # Não deve levantar — é justamente o ponto da decisão B.
        result = await dispatch_media_kit_email(db, contact, user, package=package)

    assert result.status == "failed"
    assert "OAuth" in (result.error or "")
    assert contact.email_status == "failed"
    assert "OAuth" in (contact.email_error or "")

    logged = db.add.call_args.args[0]
    assert logged.status == "failed"
    assert "OAuth" in (logged.error_message or "")


@pytest.mark.asyncio
async def test_invalid_material_ids_are_ignored_send_still_succeeds():
    """Materiais inativos/sem url são reportados como warning pelo
    compose_package, mas não bloqueiam o envio do pacote."""
    contact = _make_contact()
    user = _make_user()
    template = _make_template()
    materials = [
        _make_material(1, "Ativo", url="https://x/ok"),
        _make_material(2, "Inativo", url="https://x/off", active=False),
        _make_material(3, "Sem url", url=None),
    ]
    db = _make_db(template=template, materials=materials)
    package = PackageSelection(product_key="cimi_360", material_ids=[1, 2, 3])

    with (
        patch(
            "app.services.email_dispatch.check_daily_quota",
            return_value={
                "remaining": 100,
                "used": 0,
                "limit": 500,
                "sender_email": user.email,
            },
        ),
        patch(
            "app.services.email_dispatch.send_via_gmail",
            new=AsyncMock(return_value={"id": "gmail_x", "threadId": "thread_x"}),
        ) as mock_send,
    ):
        result = await dispatch_media_kit_email(db, contact, user, package=package)

    assert result.status == "sent"
    _, call_kwargs = mock_send.call_args
    assert "Ativo — https://x/ok" in call_kwargs["body_text"]
    assert "Inativo" not in call_kwargs["body_text"]
    assert "Sem url" not in call_kwargs["body_text"]
