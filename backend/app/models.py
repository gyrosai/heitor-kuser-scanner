from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# ── Tipos compartilhados ──────────────────────────────────────────────────────
EmailStatus = Literal["sent", "failed", "queued", "skipped"]
Language = Literal["pt-BR", "en", "es"]

ALLOWED_TAGS = ["Patrocínio", "Palestrante", "Parceria", "Cliente", "Mídia", "Follow-up"]

# Classificação CIMI — valores válidos para tags com convenção tipo:subtipo
_CLASSIFICATION_VALID: dict[str, set[str]] = {
    "cimi_invest": {"parceria", "venda"},
    "cimi_360": {"stand", "patrocinio"},
}


def _is_valid_tag(tag: str) -> bool:
    if not isinstance(tag, str):
        return False
    if tag in ALLOWED_TAGS:
        return True
    if ":" in tag:
        tipo, _, subtipo = tag.partition(":")
        valid_subtipos = _CLASSIFICATION_VALID.get(tipo)
        return valid_subtipos is not None and subtipo in valid_subtipos
    return False


class ContactData(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    source: Literal["qrcode", "card_photo"] = "qrcode"
    event_tag: Optional[str] = None
    incomplete: bool = False
    importance: Optional[int] = Field(None, ge=1, le=3)
    tags: list[str] = []
    email_language: Language = "pt-BR"
    send_email: bool = False

    @field_validator("importance", mode="before")
    @classmethod
    def validate_importance(cls, v):
        if v is None:
            return None
        try:
            v = int(v)
            return v if v in (1, 2, 3) else None
        except (ValueError, TypeError):
            return None

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        return [t for t in v if _is_valid_tag(t)]


class ScanRequest(BaseModel):
    image: str  # base64 encoded


class ScanResponse(BaseModel):
    success: bool
    contact: Optional[ContactData] = None
    error: Optional[str] = None
    raw_data: Optional[str] = None
    contact_id: Optional[int] = None


class ConflictResponse(BaseModel):
    existing: ContactData
    existing_id: int
    new: ContactData


class BatchImageItem(BaseModel):
    local_id: str = Field(..., min_length=1)
    image_base64: str = Field(..., min_length=1)


class BatchScanRequest(BaseModel):
    images: list[BatchImageItem] = Field(..., min_length=1, max_length=10)


class BatchResultItem(BaseModel):
    local_id: str
    success: bool
    contact_id: Optional[int] = None
    contact: Optional[ContactData] = None
    error: Optional[str] = None


class BatchScanResponse(BaseModel):
    results: list[BatchResultItem]


# ── E-mail explícito ──────────────────────────────────────────────────────────

class SendEmailRequest(BaseModel):
    language: Optional[Language] = None
    force: bool = False


class SendEmailResponse(BaseModel):
    status: EmailStatus
    sent_at: Optional[datetime] = None
    language: Optional[Language] = None
    gmail_message_id: Optional[str] = None
    quota_remaining: Optional[int] = None
