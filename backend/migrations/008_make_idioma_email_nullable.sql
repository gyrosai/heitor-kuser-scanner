-- idioma_email está deprecated (será dropada na Etapa 5).
-- Remove NOT NULL pra permitir que novos inserts não precisem mais preencher.
-- Dados existentes não são afetados.
ALTER TABLE scanned_contacts ALTER COLUMN idioma_email DROP NOT NULL;
