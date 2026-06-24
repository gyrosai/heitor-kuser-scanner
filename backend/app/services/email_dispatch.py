import logging
from datetime import datetime, timezone
from typing import NamedTuple, Optional

from googleapiclient.errors import HttpError
from sqlalchemy.future import select

from app.db_models import EmailLog, ScannedContact
from app.services.email_content import CONTENT_VERSION, DEFAULT_LANGUAGE
from app.services.email_quota import QuotaExceededError as LocalQuotaError
from app.services.email_quota import check_daily_quota
from app.services.email_templates.media_kit import render_plain_body, render_subject
from app.services.google_gmail_service import QuotaExceededError as GmailQuotaError
from app.services.google_gmail_service import send_via_gmail

logger = logging.getLogger(__name__)

_LANG_TO_IDIOMA: dict[str, str] = {"pt-BR": "pt-BR", "en": "en", "es": "es"}
_IDIOMA_TO_LANG: dict[str, str] = {"pt-BR": "pt-BR", "en": "en", "es": "es"}


class EmailDispatchResult(NamedTuple):
    status: str  # sent|failed|quota_exhausted|gmail_api_error|already_sent|contact_has_no_email
    sent_at: Optional[datetime] = None
    language: Optional[str] = None      # pt|en|es
    gmail_message_id: Optional[str] = None
    quota_remaining: Optional[int] = None
    error: Optional[str] = None


async def dispatch_media_kit_email(
    db,
    contact: ScannedContact,
    user,
    language: Optional[str] = None,
    force: bool = False,
) -> EmailDispatchResult:
    """Envia o Mídia Kit para o contato via Gmail API.

    Nunca levanta exceções — retorna EmailDispatchResult com status descritivo.
    Atualiza os campos de rastreamento em ScannedContact (email_status, email_sent_at,
    email_language, email_gmail_message_id, email_error, email_attempted_at).

    Args:
        db: AsyncSession da request (ou sessão isolada em bg tasks).
        contact: instância ScannedContact carregada na mesma sessão.
        user: objeto com .email e .name (CurrentUser ou duck-type).
        language: override de idioma ("pt"|"en"|"es"); None = usar contact.email_language.
        force: se True, reenvia mesmo que email_status == "sent".
    """
    if not contact.email:
        logger.info("dispatch: contato %s sem e-mail", contact.id)
        return EmailDispatchResult(status="contact_has_no_email")

    if contact.email_status == "sent" and not force:
        logger.info("dispatch: contato %s já recebeu e-mail (force=False)", contact.id)
        return EmailDispatchResult(
            status="already_sent",
            sent_at=contact.email_sent_at,
            language=contact.email_language,
        )

    # Determinar idioma
    if language:
        idioma = _LANG_TO_IDIOMA.get(language, DEFAULT_LANGUAGE)
        email_lang = language
    else:
        idioma = contact.email_language or DEFAULT_LANGUAGE
        email_lang = _IDIOMA_TO_LANG.get(idioma, "pt-BR")

    # Marcar tentativa antes da chamada (auditoria)
    contact.email_attempted_at = datetime.now(timezone.utc)
    await db.commit()

    # Renderizar conteúdo com os dados atuais do contato
    primeiro_nome = (contact.name or "").split()[0] if contact.name else ""
    evento = contact.event_tag or "evento"
    classificacao_tags = [
        t
        for t in (contact.tags or [])
        if t.startswith("cimi_invest:") or t.startswith("cimi_360:")
    ]
    subject = render_subject(evento, idioma)
    body_text = render_plain_body(primeiro_nome, evento, classificacao_tags, idioma)

    # Verificar quota antes de enviar
    quota = await check_daily_quota(db, user.email)
    if quota["remaining"] <= 0:
        contact.email_status = "failed"
        contact.email_error = f"Quota diária atingida para {user.email}"[:255]
        await db.commit()
        logger.warning("Quota atingida: user=%s contact_id=%s", user.email, contact.id)
        return EmailDispatchResult(
            status="quota_exhausted",
            quota_remaining=0,
            error=contact.email_error,
        )

    log = EmailLog(
        contact_id=contact.id,
        to_email=contact.email,
        sent_by_email=user.email,
        sent_by_name=user.name,
        subject=subject,
        idioma=idioma,
        status="queued",
        classificacoes_snapshot=classificacao_tags,
        template_version=CONTENT_VERSION,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    try:
        result = await send_via_gmail(
            user_email=user.email,
            user_name=user.name,
            to_email=contact.email,
            subject=subject,
            body_text=body_text,
            idioma=idioma,
            db=db,
        )
        now = datetime.now(timezone.utc)
        contact.email_status = "sent"
        contact.email_sent_at = now
        contact.email_language = email_lang
        contact.email_gmail_message_id = (result.get("id") or "")[:64]
        contact.email_error = None
        log.status = "sent"
        log.gmail_message_id = result.get("id")
        log.gmail_thread_id = result.get("threadId")
        log.sent_at = now
        await db.commit()
        logger.info(
            "Media kit enviado: contact_id=%s to=%s lang=%s msg_id=%s",
            contact.id,
            contact.email,
            email_lang,
            result.get("id"),
        )
        return EmailDispatchResult(
            status="sent",
            sent_at=now,
            language=email_lang,
            gmail_message_id=result.get("id"),
            quota_remaining=quota["remaining"] - 1,
        )

    except (GmailQuotaError, LocalQuotaError) as e:
        contact.email_status = "failed"
        contact.email_error = str(e)[:255]
        log.status = "quota_exceeded"
        log.error_message = str(e)[:1000]
        await db.commit()
        logger.warning("Quota Gmail: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="quota_exhausted", error=str(e)[:255])

    except HttpError as e:
        contact.email_status = "failed"
        contact.email_error = str(e)[:255]
        log.status = "failed"
        log.error_message = str(e)[:1000]
        await db.commit()
        logger.error("Gmail API error: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="gmail_api_error", error=str(e)[:255])

    except Exception as e:
        contact.email_status = "failed"
        contact.email_error = str(e)[:255]
        log.status = "failed"
        log.error_message = str(e)[:1000]
        await db.commit()
        logger.error("Falha ao enviar media kit: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="failed", error=str(e)[:255])


async def dispatch_media_kit_email_bg(
    contact_id: int,
    sender_email: str,
    sender_name: str,
    language: Optional[str] = None,
    force: bool = False,
) -> None:
    """Wrapper para uso como BackgroundTask.

    Cria sessão de DB própria e busca o contato fresco para evitar
    instâncias detached após o fim da request.
    """
    from app.database import async_session

    if async_session is None:
        return

    from app.dependencies import CurrentUser

    user = CurrentUser(email=sender_email, name=sender_name)

    async with async_session() as db:
        result = await db.execute(
            select(ScannedContact).where(ScannedContact.id == contact_id)
        )
        contact = result.scalar_one_or_none()
        if contact is None:
            logger.error("dispatch_bg: contato %s não encontrado", contact_id)
            return
        await dispatch_media_kit_email(db, contact, user, language=language, force=force)
