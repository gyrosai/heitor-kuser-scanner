import logging
from datetime import datetime

from app.db_models import EmailLog
from app.services.email_content import CONTENT_VERSION, DEFAULT_LANGUAGE
from app.services.email_quota import QuotaExceededError, can_send_now
from app.services.email_templates.media_kit import render_plain_body, render_subject
from app.services.google_gmail_service import (
    QuotaExceededError as GmailQuotaExceededError,
)
from app.services.google_gmail_service import send_via_gmail

logger = logging.getLogger(__name__)


async def enviar_media_kit(
    contato,
    sender_email: str,
    sender_name: str,
) -> None:
    """Orquestra envio do media kit via Gmail API.

    Cria sessão própria de DB para rodar como BackgroundTask sem depender
    da sessão da request. Sai silenciosamente se não houver e-mail ou evento.
    """
    from app.database import async_session

    if async_session is None:
        return
    if not contato.email or not contato.event_tag:
        return

    async with async_session() as db:
        await _enviar(contato, sender_email, sender_name, db)


async def _enviar(contato, sender_email: str, sender_name: str, db) -> EmailLog | None:
    idioma = contato.idioma_email or DEFAULT_LANGUAGE
    primeiro_nome = (contato.name or "").split()[0] if contato.name else ""
    evento = contato.event_tag or "evento"

    classificacao_tags = [
        t
        for t in (contato.tags or [])
        if t.startswith("cimi_invest:") or t.startswith("cimi_360:")
    ]

    subject = render_subject(evento, idioma)
    body_text = render_plain_body(primeiro_nome, evento, classificacao_tags, idioma)

    log = EmailLog(
        contact_id=contato.id,
        to_email=contato.email,
        sent_by_email=sender_email,
        sent_by_name=sender_name,
        subject=subject,
        idioma=idioma,
        status="queued",
        classificacoes_snapshot=classificacao_tags,
        template_version=CONTENT_VERSION,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    if not await can_send_now(db, sender_email):
        log.status = "quota_exceeded"
        log.error_message = f"Daily Gmail quota reached for {sender_email}"
        await db.commit()
        logger.warning("Quota atingida para %s — e-mail não enviado", sender_email)
        return log

    try:
        result = await send_via_gmail(
            user_email=sender_email,
            user_name=sender_name,
            to_email=contato.email,
            subject=subject,
            body_text=body_text,
            idioma=idioma,
            db=db,
        )
        log.status = "sent"
        log.gmail_message_id = result["id"]
        log.gmail_thread_id = result["threadId"]
        log.sent_at = datetime.utcnow()

    except (QuotaExceededError, GmailQuotaExceededError) as e:
        log.status = "quota_exceeded"
        log.error_message = str(e)[:1000]
        logger.warning("Quota Gmail para %s: %s", sender_email, e)
    except Exception as e:
        log.status = "failed"
        log.error_message = str(e)[:1000]
        logger.error("Falha ao enviar e-mail para %s: %s", contato.email, e)

    await db.commit()
    return log
