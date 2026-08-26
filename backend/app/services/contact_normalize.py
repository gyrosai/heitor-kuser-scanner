import logging

import phonenumbers

logger = logging.getLogger(__name__)


def phone_to_e164(raw: str | None, region: str = "BR") -> str | None:
    """Normaliza telefone para E.164. Retorna None se inválido."""
    if not raw or not isinstance(raw, str):
        return None
    cleaned = raw.strip()
    if not cleaned:
        return None
    try:
        parsed = phonenumbers.parse(cleaned, region)
        if not phonenumbers.is_valid_number(parsed):
            return None
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        return None
    except Exception:
        logger.warning("phone_to_e164: erro inesperado com %r", raw, exc_info=True)
        return None


def email_normalize(raw: str | None) -> str | None:
    """Normaliza e-mail: lowercase, strip. Retorna None se vazio."""
    if not raw or not isinstance(raw, str):
        return None
    cleaned = raw.strip().lower()
    return cleaned if cleaned else None
