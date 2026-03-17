import logging

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db_models import GoogleAuth
from app.models import ContactData

logger = logging.getLogger(__name__)


async def get_google_credentials(db: AsyncSession) -> Credentials | None:
    """Busca credenciais do Google no banco e retorna Credentials object."""
    result = await db.execute(select(GoogleAuth).limit(1))
    auth = result.scalar_one_or_none()

    if not auth:
        return None

    return Credentials(
        token=auth.access_token,
        refresh_token=auth.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=auth.scopes.split(",") if auth.scopes else [],
    )


async def save_to_google_contacts(
    contact: ContactData,
    db: AsyncSession,
) -> str | None:
    """
    Salva um contato no Google Contacts via People API.
    Retorna o resourceName do contato criado, ou None se falhar.
    """
    credentials = await get_google_credentials(db)
    if not credentials:
        logger.warning("Google não conectado — contato não salvo no Google Contacts")
        return None

    try:
        service = build("people", "v1", credentials=credentials)

        # Montar o body do contato
        person = {
            "names": [{"givenName": contact.name}] if contact.name else [],
            "phoneNumbers": (
                [{"value": contact.phone, "type": "mobile"}] if contact.phone else []
            ),
            "emailAddresses": (
                [{"value": contact.email, "type": "work"}] if contact.email else []
            ),
            "organizations": [],
            "urls": [{"value": contact.website}] if contact.website else [],
            "biographies": [],
        }

        # Empresa + cargo
        if contact.company or contact.role:
            org = {}
            if contact.company:
                org["name"] = contact.company
            if contact.role:
                org["title"] = contact.role
            person["organizations"].append(org)

        # Notas com tag do evento
        notes = []
        if contact.event_tag:
            notes.append(f"Evento: {contact.event_tag}")
        if contact.notes:
            notes.append(contact.notes)
        if notes:
            person["biographies"].append(
                {
                    "value": " | ".join(notes),
                    "contentType": "TEXT_PLAIN",
                }
            )

        # Criar no Google Contacts
        result = service.people().createContact(body=person).execute()
        resource_name = result.get("resourceName", "")

        logger.info(
            "Contato criado no Google Contacts: %s (%s)",
            contact.name,
            resource_name,
        )

        # Atualizar token no banco se foi refreshed
        auth_result = await db.execute(select(GoogleAuth).limit(1))
        auth = auth_result.scalar_one_or_none()
        if auth and credentials.token and credentials.token != auth.access_token:
            auth.access_token = credentials.token
            await db.commit()

        return resource_name

    except Exception as e:
        logger.error("Erro ao salvar no Google Contacts: %s", e)
        return None
