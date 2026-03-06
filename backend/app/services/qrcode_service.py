from __future__ import annotations

import io
import logging
import re
from typing import Optional

import vobject
from PIL import Image
from pyzbar.pyzbar import decode

from app.models import ContactData

logger = logging.getLogger(__name__)


def decode_qrcode(image_bytes: bytes) -> Optional[ContactData]:
    """Decodifica QR Code de uma imagem e retorna dados de contato."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        decoded_objects = decode(image)

        if not decoded_objects:
            logger.info("Nenhum QR Code encontrado na imagem")
            return None

        raw_data = decoded_objects[0].data.decode("utf-8")
        logger.info("QR Code decodificado: %s", raw_data[:100])

        if raw_data.strip().upper().startswith("BEGIN:VCARD"):
            return _parse_vcard(raw_data)
        elif raw_data.strip().upper().startswith("MECARD:"):
            return _parse_mecard(raw_data)
        elif raw_data.strip().startswith(("http://", "https://")):
            return _parse_url(raw_data)
        else:
            return _parse_plain_text(raw_data)

    except Exception as e:
        logger.error("Erro ao decodificar QR Code: %s", e)
        return None


def _parse_vcard(data: str) -> ContactData:
    """Parseia dados vCard usando vobject."""
    vcard = vobject.readOne(data)

    name = str(vcard.fn.value) if hasattr(vcard, "fn") else ""
    phone = None
    email = None
    company = None
    role = None
    website = None

    if hasattr(vcard, "tel"):
        phone = str(vcard.tel.value)
    if hasattr(vcard, "email"):
        email = str(vcard.email.value)
    if hasattr(vcard, "org"):
        org_value = vcard.org.value
        company = org_value[0] if isinstance(org_value, list) else str(org_value)
    if hasattr(vcard, "title"):
        role = str(vcard.title.value)
    if hasattr(vcard, "url"):
        website = str(vcard.url.value)

    return ContactData(
        name=name or "Desconhecido",
        phone=phone,
        email=email,
        company=company,
        role=role,
        website=website,
        source="qrcode",
        incomplete=not name,
    )


def _parse_mecard(data: str) -> ContactData:
    """Parseia formato MECARD."""
    fields: dict = {
        "name": None,
        "phone": None,
        "email": None,
        "company": None,
        "website": None,
    }

    content = data.strip()
    if content.upper().startswith("MECARD:"):
        content = content[7:]
    content = content.rstrip(";")

    for part in content.split(";"):
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        key = key.strip().upper()

        if key == "N":
            parts = value.split(",")
            if len(parts) >= 2:
                fields["name"] = f"{parts[1].strip()} {parts[0].strip()}"
            else:
                fields["name"] = value.strip()
        elif key == "TEL":
            fields["phone"] = value.strip()
        elif key == "EMAIL":
            fields["email"] = value.strip()
        elif key == "ORG":
            fields["company"] = value.strip()
        elif key == "URL":
            fields["website"] = value.strip()

    return ContactData(
        name=fields["name"] or "Desconhecido",
        phone=fields["phone"],
        email=fields["email"],
        company=fields["company"],
        website=fields["website"],
        source="qrcode",
        incomplete=not fields["name"],
    )


def _parse_url(data: str) -> ContactData:
    """Extrai informacoes basicas de uma URL."""
    url = data.strip()
    domain_match = re.search(r"https?://(?:www\.)?([^/]+)", url)
    domain_name = domain_match.group(1) if domain_match else url

    return ContactData(
        name=domain_name,
        website=url,
        source="qrcode",
        incomplete=True,
    )


def _parse_plain_text(data: str) -> ContactData:
    """Tenta extrair telefone e email de texto simples."""
    phone_match = re.search(r"[\+]?[\d\s\-\(\)]{8,15}", data)
    email_match = re.search(
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", data
    )

    phone = phone_match.group(0).strip() if phone_match else None
    email = email_match.group(0) if email_match else None

    return ContactData(
        name=data[:50].strip() if not email else email.split("@")[0],
        phone=phone,
        email=email,
        source="qrcode",
        incomplete=True,
    )
