from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.database import Base


class ScannedContact(Base):
    __tablename__ = "scanned_contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(20), default="card_photo")
    event_tag = Column(String(100), nullable=True)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_qr_data = Column(Text, nullable=True)
    google_contact_id = Column(String(255), nullable=True)
    importance = Column(Integer, nullable=True)
    tags = Column(ARRAY(String), nullable=False, server_default="{}")
    card_image = Column(LargeBinary, nullable=True)
    is_draft = Column(Boolean, nullable=False, server_default="true")
    idioma_email = Column(String(10), nullable=False, server_default="pt-BR")
    observacao_audio_url = Column(String(500), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("scanned_contacts.id"), nullable=True, index=True)
    to_email = Column(String(255), nullable=False)
    sent_by_email = Column(String(255), nullable=False, index=True)
    sent_by_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    idioma = Column(String(10), nullable=False)
    status = Column(String(50), nullable=False)
    gmail_message_id = Column(String(100), nullable=True)
    gmail_thread_id = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    classificacoes_snapshot = Column(ARRAY(String), nullable=True)
    template_version = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)


class GoogleAuth(Base):
    __tablename__ = "google_auth"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
