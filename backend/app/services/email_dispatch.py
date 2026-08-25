import logging
from datetime import datetime, timezone
from typing import NamedTuple, Optional

from googleapiclient.errors import HttpError
from sqlalchemy.future import select

from app.db_models import EmailLog, Material, MessageTemplate, ScannedContact
from app.materials_catalog import product_label as get_material_product_label
from app.models import PackageSelection
from app.services.email_content import CONTENT_VERSION, DEFAULT_LANGUAGE
from app.services.email_quota import QuotaExceededError as LocalQuotaError
from app.services.email_quota import check_daily_quota
from app.services.email_templates.media_kit import render_plain_body, render_subject
from app.services.google_gmail_service import QuotaExceededError as GmailQuotaError
from app.services.google_gmail_service import send_via_gmail
from app.services.package import compose_package
from app.taxonomy import parse_classification_tags

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


async def _load_package_template(
    db, product_key: str, template_id: Optional[int]
) -> Optional[MessageTemplate]:
    """Busca o MessageTemplate ativo do produto (ou um id específico).

    Retorna None se não encontrar. Regra de produto: a ausência de template
    NUNCA impede o envio — o chamador repassa ``None`` como ``template_body``
    para ``compose_package``, que usa o texto genérico embutido por idioma
    nesse caso (sem levantar exceção).
    """
    query = select(MessageTemplate).where(
        MessageTemplate.product_key == product_key,
        MessageTemplate.active.is_(True),
    )
    if template_id is not None:
        query = query.where(MessageTemplate.id == template_id)
    result = await db.execute(query)
    return result.scalars().first()


async def _load_package_materials(db, material_ids: list[int]) -> list[Material]:
    """Busca os materiais candidatos pelos ids (sem filtrar produto/ativo aqui —
    compose_package valida e reporta em warnings)."""
    if not material_ids:
        return []
    result = await db.execute(select(Material).where(Material.id.in_(material_ids)))
    return list(result.scalars().all())


async def dispatch_media_kit_email(
    db,
    contact: ScannedContact,
    user,
    language: Optional[str] = None,
    force: bool = False,
    package: Optional[PackageSelection] = None,
) -> EmailDispatchResult:
    """Envia o Mídia Kit (legado) ou o pacote de materiais do produto via Gmail API.

    Nunca levanta exceções — retorna EmailDispatchResult com status descritivo.
    Atualiza os campos de rastreamento em ScannedContact (email_status, email_sent_at,
    email_language, email_gmail_message_id, email_error, email_attempted_at).

    Uma falha no envio do pacote (OAuth expirado, Gmail indisponível etc.)
    NUNCA propaga como exceção: cai no mesmo caminho de email_status='failed'
    + erro legível, exatamente como o mídia kit legado. Template ausente não
    é mais uma falha: compose_package usa o texto genérico por idioma.

    Args:
        db: AsyncSession da request (ou sessão isolada em bg tasks).
        contact: instância ScannedContact carregada na mesma sessão.
        user: objeto com .email e .name (CurrentUser ou duck-type).
        language: override de idioma ("pt"|"en"|"es"); None = usar contact.email_language.
        force: se True, reenvia mesmo que email_status == "sent".
        package: seleção de produto/materiais/template. None = mídia kit fixo
            (comportamento 100% legado, com anexo do PDF).
    """
    if not contact.email:
        logger.info("dispatch: contato %s sem e-mail", contact.id)
        # Registra em auditoria (status='skipped'), mas nunca bloqueia o save:
        # o contato já foi salvo antes desta chamada (background task ou
        # ação de reenvio explícita).
        db.add(
            EmailLog(
                contact_id=contact.id,
                to_email="",
                sent_by_email=user.email,
                sent_by_name=user.name,
                subject="",
                idioma=language or contact.email_language or DEFAULT_LANGUAGE,
                status="skipped",
                classificacoes_snapshot=[],
                template_version=CONTENT_VERSION,
                channel="email",
                product_key=package.product_key if package else None,
                material_ids=package.material_ids if package else [],
                template_id=package.template_id if package else None,
            )
        )
        await db.commit()
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
    # Snapshot de classificação: cobre os 5 produtos da taxonomia (cimi_360,
    # cimi_invest, leilao, indip, feirao), não só os dois primeiros implementados
    # originalmente.
    classificacao_tags = [
        f"{product_key}:{slug}"
        for product_key, slug in parse_classification_tags(contact.tags or []).items()
    ]
    # Assunto é o mesmo para os dois caminhos (legado e pacote) — decisão do
    # produto: sem variação por produto por enquanto.
    subject = render_subject(evento, idioma)

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
        channel="email",
        product_key=package.product_key if package else None,
        material_ids=package.material_ids if package else [],
        template_id=package.template_id if package else None,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    body_text: Optional[str] = None
    try:
        package_warnings: list[str] = []
        if package is not None:
            template = await _load_package_template(
                db, package.product_key, package.template_id
            )
            materials = await _load_package_materials(db, package.material_ids)
            composed = compose_package(
                contact=contact,
                product_key=package.product_key,
                product_label=get_material_product_label(package.product_key),
                language=email_lang,
                material_ids=package.material_ids,
                materials=materials,
                template_body=template.body if template else None,
                subject=subject,
            )
            body_text = composed.text
            body_html = composed.html
            package_warnings = composed.warnings
            attach_media_kit = False
            if package_warnings:
                logger.info(
                    "compose_package warnings: contact_id=%s product=%s %s",
                    contact.id,
                    package.product_key,
                    package_warnings,
                )
        else:
            body_text = render_plain_body(
                primeiro_nome, evento, classificacao_tags, idioma
            )
            body_html = None
            attach_media_kit = True

        result = await send_via_gmail(
            user_email=user.email,
            user_name=user.name,
            to_email=contact.email,
            subject=subject,
            body_text=body_text,
            idioma=idioma,
            db=db,
            body_html=body_html,
            attach_media_kit=attach_media_kit,
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
        log.message_snapshot = body_text
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
        log.message_snapshot = body_text
        await db.commit()
        logger.warning("Quota Gmail: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="quota_exhausted", error=str(e)[:255])

    except HttpError as e:
        contact.email_status = "failed"
        contact.email_error = str(e)[:255]
        log.status = "failed"
        log.error_message = str(e)[:1000]
        log.message_snapshot = body_text
        await db.commit()
        logger.error("Gmail API error: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="gmail_api_error", error=str(e)[:255])

    except Exception as e:
        contact.email_status = "failed"
        contact.email_error = str(e)[:255]
        log.status = "failed"
        log.error_message = str(e)[:1000]
        log.message_snapshot = body_text
        await db.commit()
        logger.error("Falha ao enviar media kit: contact_id=%s: %s", contact.id, e)
        return EmailDispatchResult(status="failed", error=str(e)[:255])


async def dispatch_media_kit_email_bg(
    contact_id: int,
    sender_email: str,
    sender_name: str,
    language: Optional[str] = None,
    force: bool = False,
    package: Optional[PackageSelection] = None,
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
        await dispatch_media_kit_email(
            db, contact, user, language=language, force=force, package=package
        )
