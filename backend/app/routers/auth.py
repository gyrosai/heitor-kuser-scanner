from __future__ import annotations

import os
import logging
import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from google_auth_oauthlib.flow import Flow
from app.config import settings
from app.database import get_db
from app.db_models import GoogleAuth
from app.dependencies import CurrentUser, get_current_user, get_current_user_optional

# Relaxar validação de scope — Google adiciona "openid" automaticamente
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send",
]


def create_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
    return flow


@router.get("/google")
async def google_auth():
    flow = create_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        flow = create_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        if not credentials.refresh_token:
            logger.warning("Não recebeu refresh_token")

        userinfo_resp = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"},
        )
        userinfo = userinfo_resp.json()
        user_email = userinfo.get("email", "unknown")
        user_name = userinfo.get("name") or user_email.split("@")[0]
        logger.info("Google OAuth sucesso para: %s", user_email)

        result = await db.execute(
            select(GoogleAuth).where(GoogleAuth.user_email == user_email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.access_token = credentials.token
            if credentials.refresh_token:
                existing.refresh_token = credentials.refresh_token
            existing.token_expiry = credentials.expiry
            existing.scopes = " ".join(credentials.scopes or [])
        else:
            db.add(GoogleAuth(
                user_email=user_email,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token or "",
                token_expiry=credentials.expiry,
                scopes=" ".join(credentials.scopes or []),
            ))

        await db.commit()
        logger.info("Tokens salvos no banco para: %s", user_email)

        request.session["user_email"] = user_email
        request.session["user_name"] = user_name

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}?google_connected=true"
        )

    except Exception as e:
        logger.error("Erro no callback OAuth: %s", e, exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}?google_error={str(e)[:100]}"
        )


@router.get("/google/status")
async def google_status(
    current_user: CurrentUser | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if not current_user:
        return {"authenticated": False}

    result = await db.execute(
        select(GoogleAuth).where(GoogleAuth.user_email == current_user.email)
    )
    auth = result.scalar_one_or_none()
    scopes = (auth.scopes or "").split() if auth else []
    has_gmail = "https://www.googleapis.com/auth/gmail.send" in scopes

    return {
        "authenticated": True,
        "user_email": current_user.email,
        "user_name": current_user.name,
        "scopes": scopes,
        "has_gmail_send": has_gmail,
    }


@router.post("/google/disconnect")
async def google_disconnect(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(GoogleAuth).where(GoogleAuth.user_email == current_user.email)
    )
    await db.commit()
    request.session.clear()
    logger.info("Google desconectado para: %s", current_user.email)
    return {"status": "disconnected"}
