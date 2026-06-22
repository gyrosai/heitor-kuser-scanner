import base64
import html
import logging
import re
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings
from app.services.google_contacts_service import get_google_credentials

logger = logging.getLogger(__name__)

MEDIA_KIT_DIR = Path(settings.MEDIA_KIT_DIR)


class QuotaExceededError(Exception):
    pass


def get_media_kit_path(idioma: str) -> Path:
    """Retorna o PDF do media kit para o idioma pedido.
    Fallback para pt-BR se o arquivo do idioma não existir.
    """
    candidate = MEDIA_KIT_DIR / f"media-kit-{idioma}.pdf"
    if candidate.exists():
        return candidate
    return MEDIA_KIT_DIR / "media-kit-pt-BR.pdf"


_URL_RE = re.compile(r"(https?://[^\s<>\"']+)")


def _plain_to_html(text: str) -> str:
    """Converte texto plano em HTML simples.

    Ordem: escape → linkify → parágrafos/quebras.
    Preserva a assinatura do Gmail que o cliente anexa após o body.
    """
    escaped = html.escape(text)
    linked = _URL_RE.sub(r'<a href="\1">\1</a>', escaped)
    paragraphs = linked.split("\n\n")
    parts = [
        f"<p>{p.replace(chr(10), '<br>')}</p>"
        for p in paragraphs
        if p.strip()
    ]
    return (
        '<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px">'
        + "\n".join(parts)
        + "</body></html>"
    )


def _build_gmail_service(credentials):
    return build("gmail", "v1", credentials=credentials)


def _build_mime_message(
    from_name: str,
    from_email: str,
    to_email: str,
    subject: str,
    body_text: str,
    attachment_path: Path,
    attachment_filename: str = "CIMI360-Media-Kit.pdf",
) -> str:
    """Monta multipart/mixed com alternative (plain+html) + PDF.

    Estrutura:
        multipart/mixed
        ├── multipart/alternative
        │   ├── text/plain   (fallback)
        │   └── text/html    (preferido — RFC 2046: best last)
        └── application/pdf  (anexo)
    """
    outer = MIMEMultipart("mixed")
    outer["From"] = f"{from_name} <{from_email}>"
    outer["To"] = to_email
    outer["Subject"] = subject

    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(body_text, "plain", "utf-8"))
    alternative.attach(MIMEText(_plain_to_html(body_text), "html", "utf-8"))
    outer.attach(alternative)

    with open(attachment_path, "rb") as f:
        part = MIMEBase("application", "pdf")
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{attachment_filename}"',
        )
        outer.attach(part)

    return base64.urlsafe_b64encode(outer.as_bytes()).decode("utf-8")


async def send_via_gmail(
    user_email: str,
    user_name: str,
    to_email: str,
    subject: str,
    body_text: str,
    idioma: str,
    db,
) -> dict:
    """Envia e-mail via Gmail API usando OAuth do user.

    Retorna {"id": gmail_message_id, "threadId": gmail_thread_id}.
    Levanta QuotaExceededError ou HttpError em caso de falha.
    """
    attachment_path = get_media_kit_path(idioma)
    if not attachment_path.exists():
        raise FileNotFoundError(f"Media Kit não encontrado: {attachment_path}")

    credentials = await get_google_credentials(db, user_email)
    if not credentials:
        raise PermissionError(f"OAuth não autorizado para {user_email}")

    service = _build_gmail_service(credentials)

    raw_message = _build_mime_message(
        from_name=user_name,
        from_email=user_email,
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        attachment_path=attachment_path,
    )

    try:
        result = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw_message})
            .execute()
        )
        logger.info(
            "Gmail enviado: %s → %s (id=%s)", user_email, to_email, result.get("id")
        )
        return {
            "id": result.get("id"),
            "threadId": result.get("threadId"),
        }
    except HttpError as e:
        if e.resp.status == 429 or "quota" in str(e).lower():
            raise QuotaExceededError(str(e))
        raise
