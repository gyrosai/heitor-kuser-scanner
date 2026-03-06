from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


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


class ScanRequest(BaseModel):
    image: str  # base64 encoded


class ScanResponse(BaseModel):
    success: bool
    contact: Optional[ContactData] = None
    error: Optional[str] = None
    raw_data: Optional[str] = None
