import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.db_models import GoogleAuth

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth")

SCOPES = ["https://www.googleapis.com/auth/contacts"]


def create_flow() -> Flow:
    """Cria o flow OAuth do Google."""
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
    """Inicia o fluxo OAuth — redireciona pro Google."""
    flow = create_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Callback do OAuth — recebe o code e troca por tokens."""
    try:
        flow = create_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        if not credentials.refresh_token:
            raise HTTPException(
                status_code=400,
                detail="Não recebeu refresh_token. Tente desconectar o app em myaccount.google.com e reconectar.",
            )

        # Descobrir email do usuário
        from googleapiclient.discovery import build

        service = build("people", "v1", credentials=credentials)
        profile = (
            service.people()
            .get(resourceName="people/me", personFields="emailAddresses")
            .execute()
        )

        email = profile.get("emailAddresses", [{}])[0].get("value", "unknown")

        # Salvar ou atualizar no banco
        result = await db.execute(
            select(GoogleAuth).where(GoogleAuth.user_email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.access_token = credentials.token
            existing.refresh_token = credentials.refresh_token
            existing.token_expiry = credentials.expiry
            existing.scopes = ",".join(credentials.scopes or [])
        else:
            auth = GoogleAuth(
                user_email=email,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expiry=credentials.expiry,
                scopes=",".join(credentials.scopes or []),
            )
            db.add(auth)

        await db.commit()
        logger.info("Google auth salvo para: %s", email)

        return RedirectResponse(url=f"{settings.FRONTEND_URL}?google_connected=true")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro no callback OAuth: %s", e)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}?google_error={str(e)}"
        )


@router.get("/google/status")
async def google_status(db: AsyncSession = Depends(get_db)):
    """Verifica se tem uma conta Google conectada."""
    if db is None:
        return {"connected": False}
    result = await db.execute(select(GoogleAuth).limit(1))
    auth = result.scalar_one_or_none()
    if auth:
        return {
            "connected": True,
            "email": auth.user_email,
        }
    return {"connected": False}
