from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.sql import func

from app.database import Base

# JSONB no Postgres (produção), JSON genérico no SQLite (testes com aiosqlite).
JSONType = JSON().with_variant(JSONB(), "postgresql")


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
    idioma_email = Column(String(10), nullable=True)  # DEPRECATED: dropar na Etapa 5
    observacao_audio_url = Column(String(500), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # ── Rastreamento de envio de e-mail ──────────────────────────────────────
    # Preenchidos pelo serviço de e-mail após cada tentativa de envio.
    # NULL em email_status = nunca tentou enviar.
    email_status = Column(String(20), nullable=True)             # sent|failed|queued|skipped
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_language = Column(String(10), nullable=True)           # pt-BR|en|es
    email_error = Column(Text, nullable=True)
    email_gmail_message_id = Column(String(64), nullable=True)
    email_attempted_at = Column(DateTime(timezone=True), nullable=True)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("scanned_contacts.id", ondelete="SET NULL"), nullable=True, index=True)
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


class Material(Base):
    """Material de um produto: link externo ou evento (missão comercial).

    kind: "link" (url) | "evento" (url + meta.date/meta.location).
    Templates de mensagem (kind "texto" no CSV) vivem em MessageTemplate.
    Idioma segue o CSV: NULL | PT | ENG | ESP.
    """

    __tablename__ = "materials"
    __table_args__ = (
        UniqueConstraint(
            "product_key", "group_name", "label", "language", name="uq_material_identity"
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_key = Column(Text, nullable=False)
    group_name = Column(Text, nullable=False)
    label = Column(Text, nullable=False)
    kind = Column(Text, nullable=False)            # link | evento
    language = Column(Text, nullable=True)         # NULL | PT | ENG | ESP
    url = Column(Text, nullable=True)
    meta = Column(JSONType, nullable=False, server_default="{}", default=dict)
    sort_order = Column(Integer, nullable=False, server_default="0", default=0)
    active = Column(Boolean, nullable=False, server_default="false", default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MessageTemplate(Base):
    """Template de mensagem padrão por produto (linhas tipo "texto" do CSV).

    body aceita placeholders {nome} {primeiro_nome} {evento} {produto}.
    """

    __tablename__ = "message_templates"
    __table_args__ = (
        UniqueConstraint("product_key", "name", name="uq_template_identity"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_key = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    active = Column(Boolean, nullable=False, server_default="true", default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


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
