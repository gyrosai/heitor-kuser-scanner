"""Testes de app.services.google_gmail_service — anexo condicional (PDF do
mídia kit legado) vs. pacote de materiais (só HTML/texto, sem anexo).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_google_gmail_service.py -v
"""

from __future__ import annotations

import base64
from email import message_from_bytes
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.google_gmail_service import _build_mime_message, send_via_gmail


def _decode(raw_message: str):
    return message_from_bytes(base64.urlsafe_b64decode(raw_message.encode("utf-8")))


# ═══════════════════════════════════════════════════════════════════════════
# _build_mime_message
# ═══════════════════════════════════════════════════════════════════════════


def test_without_attachment_is_alternative_only_no_pdf():
    raw = _build_mime_message(
        from_name="Heitor",
        from_email="heitor@cimi.com.br",
        to_email="lead@example.com",
        subject="Materiais CIMI Invest",
        body_text="Olá, segue o material.",
    )
    msg = _decode(raw)
    assert msg.get_content_type() == "multipart/alternative"
    payload = msg.get_payload()
    content_types = {p.get_content_type() for p in payload}
    assert content_types == {"text/plain", "text/html"}
    assert "application/pdf" not in content_types


def test_with_attachment_is_mixed_with_pdf(tmp_path):
    pdf_path = tmp_path / "media-kit-pt-BR.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake content")

    raw = _build_mime_message(
        from_name="Heitor",
        from_email="heitor@cimi.com.br",
        to_email="lead@example.com",
        subject="Mídia Kit",
        body_text="Olá, segue o mídia kit.",
        attachment_path=pdf_path,
    )
    msg = _decode(raw)
    assert msg.get_content_type() == "multipart/mixed"

    parts = list(msg.walk())
    pdf_parts = [p for p in parts if p.get_content_type() == "application/pdf"]
    assert len(pdf_parts) == 1
    assert 'filename="CIMI360-Media-Kit.pdf"' in str(
        pdf_parts[0].get("Content-Disposition")
    )

    plain_parts = [p for p in parts if p.get_content_type() == "text/plain"]
    html_parts = [p for p in parts if p.get_content_type() == "text/html"]
    assert len(plain_parts) == 1
    assert len(html_parts) == 1


def test_custom_body_html_is_used_verbatim_when_provided():
    custom_html = '<!DOCTYPE html><html><body><p>Custom</p><a href="https://x">Kit</a></body></html>'
    raw = _build_mime_message(
        from_name="Heitor",
        from_email="heitor@cimi.com.br",
        to_email="lead@example.com",
        subject="Pacote",
        body_text="Custom",
        body_html=custom_html,
    )
    msg = _decode(raw)
    html_part = next(p for p in msg.walk() if p.get_content_type() == "text/html")
    assert html_part.get_payload(decode=True).decode("utf-8") == custom_html


def test_without_custom_html_auto_generates_from_text():
    raw = _build_mime_message(
        from_name="Heitor",
        from_email="heitor@cimi.com.br",
        to_email="lead@example.com",
        subject="Legado",
        body_text="Visite https://cimi.com.br para saber mais.",
    )
    msg = _decode(raw)
    html_part = next(p for p in msg.walk() if p.get_content_type() == "text/html")
    html_body = html_part.get_payload(decode=True).decode("utf-8")
    assert '<a href="https://cimi.com.br">https://cimi.com.br</a>' in html_body


# ═══════════════════════════════════════════════════════════════════════════
# send_via_gmail — anexo condicional
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_package_path_attach_media_kit_false_skips_pdf_lookup():
    """Pacote de materiais (attach_media_kit=False) não deve nem tentar
    localizar o PDF do mídia kit — evita FileNotFoundError indevido."""
    fake_service = MagicMock()
    fake_service.users.return_value.messages.return_value.send.return_value.execute.return_value = {
        "id": "msg1",
        "threadId": "thread1",
    }

    with (
        patch("app.services.google_gmail_service.get_media_kit_path") as mock_get_path,
        patch(
            "app.services.google_gmail_service.get_google_credentials",
            new=AsyncMock(return_value=MagicMock()),
        ),
        patch(
            "app.services.google_gmail_service._build_gmail_service",
            return_value=fake_service,
        ),
    ):
        result = await send_via_gmail(
            user_email="heitor@cimi.com.br",
            user_name="Heitor",
            to_email="lead@example.com",
            subject="Pacote CIMI Invest",
            body_text="Segue o material.",
            idioma="pt-BR",
            db=MagicMock(),
            body_html="<p>Segue o material.</p>",
            attach_media_kit=False,
        )

    mock_get_path.assert_not_called()
    assert result == {"id": "msg1", "threadId": "thread1"}


@pytest.mark.asyncio
async def test_legacy_path_still_requires_media_kit_pdf(tmp_path):
    """attach_media_kit=True (padrão) preserva o comportamento legado: sem
    o PDF do idioma, levanta FileNotFoundError."""
    with (
        patch(
            "app.services.google_gmail_service.get_media_kit_path",
            return_value=tmp_path / "nao-existe.pdf",
        ),
        pytest.raises(FileNotFoundError),
    ):
        await send_via_gmail(
            user_email="heitor@cimi.com.br",
            user_name="Heitor",
            to_email="lead@example.com",
            subject="Mídia Kit",
            body_text="Olá.",
            idioma="pt-BR",
            db=MagicMock(),
        )
