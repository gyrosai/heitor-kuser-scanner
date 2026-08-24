from __future__ import annotations

import logging
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.taxonomy import ALLOWED_TAGS_SET, INTEREST_TYPES, is_valid_classification

# ── Tipos compartilhados ──────────────────────────────────────────────────────
EmailStatus = Literal["sent", "failed", "queued", "skipped"]
Language = Literal["pt-BR", "en", "es"]

logger = logging.getLogger(__name__)

# Compatibilidade: ALLOWED_TAGS é o nome antigo usado em vários imports
ALLOWED_TAGS = list(INTEREST_TYPES)


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
        valid: list[str] = []
        dropped: list[str] = []
        for t in v:
            if t in ALLOWED_TAGS_SET:
                valid.append(t)
                continue
            if ":" in t:
                ok, reason = is_valid_classification(t)
                if ok:
                    valid.append(t)
                else:
                    # classificação inválida → 422 (ValueError é convertido por Pydantic)
                    raise ValueError(reason or f"classificação inválida: {t}")
            else:
                dropped.append(t)
        if dropped:
            logger.warning("Tags de interesse desconhecidas removidas: %s", dropped)
        return valid


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
