import os
import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google_auth_oauthlib.flow import Flow
from app.config import settings
from app.database import get_db
from app.db_models import GoogleAuth

# Relaxar validação de scope — Google adiciona "openid" automaticamente
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/userinfo.email",
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
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Trocar code por tokens
        flow = create_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        if not credentials.refresh_token:
            logger.warning("Não recebeu refresh_token")

        # 2. Buscar email via userinfo (NÃO usar People API aqui)
        userinfo_resp = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"},
        )
        userinfo = userinfo_resp.json()
        email = userinfo.get("email", "unknown")
        logger.info("Google OAuth sucesso para: %s", email)

        # 3. Salvar tokens no banco
        result = await db.execute(
            select(GoogleAuth).where(GoogleAuth.user_email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.access_token = credentials.token
            if credentials.refresh_token:
                existing.refresh_token = credentials.refresh_token
            existing.token_expiry = credentials.expiry
            existing.scopes = " ".join(credentials.scopes or [])
        else:
            auth = GoogleAuth(
                user_email=email,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token or "",
                token_expiry=credentials.expiry,
                scopes=" ".join(credentials.scopes or []),
            )
            db.add(auth)

        await db.commit()
        logger.info("Tokens salvos no banco para: %s", email)

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}?google_connected=true"
        )

    except Exception as e:
        logger.error("Erro no callback OAuth: %s", e, exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}?google_error={str(e)[:100]}"
        )


@router.get("/google/status")
async def google_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GoogleAuth).limit(1))
    auth = result.scalar_one_or_none()
    if auth:
        return {"connected": True, "email": auth.user_email}
    return {"connected": False}
