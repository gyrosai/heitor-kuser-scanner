-- 003_add_idioma_email_audio_url.sql
-- Adiciona idioma_email e observacao_audio_url à tabela scanned_contacts.
-- IDEMPOTENTE: pode rodar múltiplas vezes sem efeito colateral.

ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS idioma_email VARCHAR(10) NOT NULL DEFAULT 'pt-BR';
ALTER TABLE scanned_contacts ADD COLUMN IF NOT EXISTS observacao_audio_url VARCHAR(500);
