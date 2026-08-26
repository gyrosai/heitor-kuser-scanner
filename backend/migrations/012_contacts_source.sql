-- 012_contacts_source.sql
-- Adiciona colunas normalizadas para dedup e labels de importação.
-- IDEMPOTENTE: pode rodar múltiplas vezes sem efeito colateral.

ALTER TABLE scanned_contacts
    ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
    ADD COLUMN IF NOT EXISTS email_norm TEXT,
    ADD COLUMN IF NOT EXISTS import_labels TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS ix_scanned_contacts_phone_e164
    ON scanned_contacts(phone_e164);

CREATE INDEX IF NOT EXISTS ix_scanned_contacts_email_norm
    ON scanned_contacts(email_norm);
