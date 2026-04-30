-- 001_add_crm_columns.sql
-- Adiciona colunas do CRM leve à tabela scanned_contacts.
-- IDEMPOTENTE: pode rodar múltiplas vezes sem efeito colateral.

ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS importance INTEGER;
ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS card_image BYTEA;
ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
