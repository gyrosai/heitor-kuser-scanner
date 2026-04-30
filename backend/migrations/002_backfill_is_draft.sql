-- 002_backfill_is_draft.sql
--
-- ATENÇÃO: ONE-SHOT. Rodar UMA ÚNICA VEZ logo após 001_add_crm_columns.sql.
--
-- Após 001, todas as linhas existentes ficam com is_draft=TRUE (default da
-- coluna nova). Este UPDATE marca essas linhas como NÃO-draft, porque foram
-- criadas antes da feature de drafts existir.
--
-- NÃO é idempotente: se rodar de novo depois que o app está em produção,
-- vai promover todos os drafts em andamento (scans não finalizados) pra
-- não-draft, quebrando o fluxo de scan.

UPDATE scanned_contacts SET is_draft = FALSE WHERE is_draft = TRUE;
