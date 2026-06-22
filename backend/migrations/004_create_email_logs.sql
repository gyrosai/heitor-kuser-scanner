-- 004_create_email_logs.sql
-- Cria tabela de log de e-mails enviados via Gmail API.
-- IDEMPOTENTE: pode rodar múltiplas vezes sem efeito colateral.

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES scanned_contacts(id),
    to_email VARCHAR(255) NOT NULL,
    sent_by_email VARCHAR(255) NOT NULL,
    sent_by_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    idioma VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    gmail_message_id VARCHAR(100),
    gmail_thread_id VARCHAR(100),
    error_message TEXT,
    classificacoes_snapshot TEXT[],
    template_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_email_logs_contact_id ON email_logs (contact_id);
CREATE INDEX IF NOT EXISTS ix_email_logs_sent_by_email ON email_logs (sent_by_email);
