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


def build_structured_note(contact: ContactData) -> str:
    """Monta a nota que vai pro Google Contacts com tags+estrelas+obs."""
    lines = []
    header_parts = []
    if contact.event_tag:
        header_parts.append(f"[{contact.event_tag}]")
    if contact.importance:
        header_parts.append("⭐" * contact.importance)
    if header_parts:
        lines.append(" ".join(header_parts))
    if contact.tags:
        lines.append(f"Tags: {', '.join(contact.tags)}")
    if (header_parts or contact.tags) and contact.notes:
        lines.append("---")
    if contact.notes:
        lines.append(contact.notes)
    return "\n".join(lines)


def _build_person_body(contact: ContactData) -> dict:
    """Constrói o body da People API a partir de um ContactData."""
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

    if contact.company or contact.role:
        org = {}
        if contact.company:
            org["name"] = contact.company
        if contact.role:
            org["title"] = contact.role
        person["organizations"].append(org)

    note = build_structured_note(contact)
    if note:
        person["biographies"].append(
            {
                "value": note,
                "contentType": "TEXT_PLAIN",
            }
        )

    return person


async def _persist_refreshed_token(credentials: Credentials, db: AsyncSession) -> None:
    """Atualiza access_token no banco se o cliente Google fez refresh."""
    auth_result = await db.execute(select(GoogleAuth).limit(1))
    auth = auth_result.scalar_one_or_none()
    if auth and credentials.token and credentials.token != auth.access_token:
        auth.access_token = credentials.token
        await db.commit()


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
        person = _build_person_body(contact)

        result = service.people().createContact(body=person).execute()
        resource_name = result.get("resourceName", "")

        logger.info(
            "Contato criado no Google Contacts: %s (%s)",
            contact.name,
            resource_name,
        )

        await _persist_refreshed_token(credentials, db)
        return resource_name

    except Exception as e:
        logger.error("Erro ao salvar no Google Contacts: %s", e)
        return None


async def update_google_contact(
    contact: ContactData,
    resource_name: str,
    db: AsyncSession,
) -> bool:
    """Atualiza um contato existente no Google Contacts. Retorna True se ok."""
    credentials = await get_google_credentials(db)
    if not credentials:
        logger.warning("Google não conectado — update não enviado")
        return False

    try:
        service = build("people", "v1", credentials=credentials)

        existing = (
            service.people()
            .get(resourceName=resource_name, personFields="metadata")
            .execute()
        )
        etag = existing.get("etag")

        person = _build_person_body(contact)
        if etag:
            person["etag"] = etag

        service.people().updateContact(
            resourceName=resource_name,
            updatePersonFields="names,phoneNumbers,emailAddresses,organizations,urls,biographies",
            body=person,
        ).execute()

        logger.info(
            "Contato atualizado no Google Contacts: %s (%s)",
            contact.name,
            resource_name,
        )

        await _persist_refreshed_token(credentials, db)
        return True

    except Exception as e:
        logger.error("Erro ao atualizar no Google Contacts (%s): %s", resource_name, e)
        return False


async def delete_google_contact(resource_name: str, db: AsyncSession) -> bool:
    """Deleta um contato no Google Contacts. Retorna True se ok."""
    credentials = await get_google_credentials(db)
    if not credentials:
        logger.warning("Google não conectado — delete não enviado")
        return False

    try:
        service = build("people", "v1", credentials=credentials)
        service.people().deleteContact(resourceName=resource_name).execute()

        logger.info("Contato deletado no Google Contacts: %s", resource_name)

        await _persist_refreshed_token(credentials, db)
        return True

    except Exception as e:
        logger.error("Erro ao deletar no Google Contacts (%s): %s", resource_name, e)
        return False
