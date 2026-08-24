-- 011_email_logs_package.sql
-- Estende email_logs para registrar envios de "pacote de materiais" (produto +
-- template + materiais selecionados), reaproveitando a tabela existente em vez
-- de criar uma nova (email_logs já cobre contact_id/subject/status/error/sent_at).
-- channel default 'email' é o gancho para WhatsApp futuro no mesmo canal de log.
-- IDEMPOTENTE e ADITIVA: pode rodar múltiplas vezes; nunca DROP.
-- Aplicar em produção só com pg_dump feito e verificado.

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email';

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS product_key TEXT;

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS material_ids INTEGER[] NOT NULL DEFAULT '{}';

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES message_templates(id);

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS message_snapshot TEXT;

CREATE INDEX IF NOT EXISTS ix_email_logs_product_key ON email_logs (product_key);
