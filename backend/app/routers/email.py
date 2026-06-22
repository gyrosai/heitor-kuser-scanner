import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.database import get_db
from app.db_models import EmailLog, ScannedContact
from app.dependencies import CurrentUser, get_current_user
from app.services.email_quota import check_daily_quota
from app.services.email_service import _enviar

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/emails")


@router.post("/test")
async def test_email(
    to: str,
    idioma: str = "pt-BR",
    evento: str = "CIMI360",
    nome: str = "Teste",
    db=Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Dispara e-mail de teste sem persistir contato no banco."""
    if db is None:
        return {"error": "Banco de dados não configurado"}

    class _FakeContato:
        id = None
        email = to
        name = nome
        event_tag = evento
        idioma_email = idioma
        tags: list = []

    log = await _enviar(_FakeContato(), current_user.email, current_user.name, db)
    if log is None:
        return {"status": "skipped", "reason": "sem email ou evento"}

    return {
        "status": log.status,
        "gmail_message_id": log.gmail_message_id,
        "error": log.error_message,
    }


@router.get("/quota")
async def get_quota(
    db=Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retorna uso de quota do dia do user logado."""
    if db is None:
        return {"error": "Banco de dados não configurado"}
    return await check_daily_quota(db, current_user.email)


@router.get("/logs")
async def list_email_logs(
    contact_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    db=Depends(get_db),
):
    """Histórico de e-mails enviados."""
    if db is None:
        return []

    query = select(EmailLog).order_by(EmailLog.created_at.desc()).limit(limit)
    if contact_id is not None:
        query = query.where(EmailLog.contact_id == contact_id)
    if status:
        query = query.where(EmailLog.status == status)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": l.id,
            "contact_id": l.contact_id,
            "to_email": l.to_email,
            "sent_by_email": l.sent_by_email,
            "subject": l.subject,
            "idioma": l.idioma,
            "status": l.status,
            "gmail_message_id": l.gmail_message_id,
            "error_message": l.error_message,
            "template_version": l.template_version,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "sent_at": l.sent_at.isoformat() if l.sent_at else None,
        }
        for l in logs
    ]
