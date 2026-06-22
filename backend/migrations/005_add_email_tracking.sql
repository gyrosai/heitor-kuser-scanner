-- ============================================================
-- 005_add_email_tracking.sql
-- Adiciona colunas de rastreamento de e-mail em scanned_contacts.
--
-- DIVERGÊNCIAS em relação ao spec original — confirmar antes de aplicar:
--
--   1. Nome da tabela: o spec dizia "contacts"; a tabela real é
--      "scanned_contacts". Esta migration usa o nome correto.
--
--   2. Coluna user_id: não existe em scanned_contacts (contatos não
--      têm FK para usuário na tabela atual). O índice do spec:
--        ON contacts (user_id, email_sent_at) WHERE email_status = 'sent'
--      foi adaptado para usar apenas email_sent_at. Se quiser o filtro
--      por usuário, adicione uma coluna user_email ou user_id primeiro.
--
-- Valores válidos para email_status:
--   NULL      → nunca tentou
--   'queued'  → enfileirado (background task criada)
--   'sent'    → enviado com sucesso
--   'failed'  → falhou (detalhe em email_error)
--   'skipped' → pulado intencionalmente (sem e-mail, cota esgotada etc.)
--
-- É idempotente (IF NOT EXISTS em todos os DDL).
-- ============================================================

ALTER TABLE scanned_contacts
  ADD COLUMN IF NOT EXISTS email_status             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_sent_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_language           VARCHAR(2),
  ADD COLUMN IF NOT EXISTS email_error              TEXT,
  ADD COLUMN IF NOT EXISTS email_gmail_message_id   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_attempted_at       TIMESTAMPTZ;

-- Índice parcial: buscas de "quem já recebeu" são o caso mais comum.
-- user_id omitido (ver divergência 2 acima).
CREATE INDEX IF NOT EXISTS idx_scanned_contacts_email_sent
  ON scanned_contacts (email_sent_at)
  WHERE email_status = 'sent';
