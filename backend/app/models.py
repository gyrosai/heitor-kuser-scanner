from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

ALLOWED_TAGS = ["Patrocínio", "Palestrante", "Parceria", "Cliente", "Mídia", "Follow-up"]


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
        return [t for t in v if isinstance(t, str) and t in ALLOWED_TAGS]


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
