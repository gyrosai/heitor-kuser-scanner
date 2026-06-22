from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.config import settings
from app.db_models import EmailLog


class QuotaExceededError(Exception):
    pass


async def check_daily_quota(db, sender_email: str) -> dict:
    """Conta e-mails enviados com status 'sent' nas últimas 24h por este sender."""
    cutoff = datetime.utcnow() - timedelta(hours=24)

    result = await db.execute(
        select(func.count(EmailLog.id))
        .where(EmailLog.sent_by_email == sender_email)
        .where(EmailLog.sent_at >= cutoff)
        .where(EmailLog.status == "sent")
    )
    used = result.scalar() or 0

    limit = settings.EMAIL_DAILY_LIMIT
    return {
        "sender_email": sender_email,
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
    }


async def can_send_now(db, sender_email: str) -> bool:
    quota = await check_daily_quota(db, sender_email)
    return quota["remaining"] > 0
