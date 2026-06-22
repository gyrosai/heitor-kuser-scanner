-- ============================================================
-- 001_add_email_dispatch_fields.sql
-- Adiciona colunas de rastreamento de e-mail em scanned_contacts.
--
-- Idempotente (IF NOT EXISTS em todos os DDL) — seguro re-rodar.
--
-- Aplicar:
--   psql "$DATABASE_URL" -f backend/scripts/migrations/001_add_email_dispatch_fields.sql
-- ============================================================

ALTER TABLE scanned_contacts
  ADD COLUMN IF NOT EXISTS email_status             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_sent_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_language           VARCHAR(2),
  ADD COLUMN IF NOT EXISTS email_error              TEXT,
  ADD COLUMN IF NOT EXISTS email_gmail_message_id   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_attempted_at       TIMESTAMPTZ;

-- Índice parcial para buscas de "quem já recebeu" (caso mais comum).
CREATE INDEX IF NOT EXISTS idx_scanned_contacts_email_sent
  ON scanned_contacts (email_sent_at)
  WHERE email_status = 'sent';
