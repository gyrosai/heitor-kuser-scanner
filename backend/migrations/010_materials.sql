-- 010_materials.sql
-- Biblioteca de materiais (links externos) + templates de mensagem por produto.
-- Alimenta GET /api/materials e GET /api/templates; administração via import CSV.
-- IDEMPOTENTE e ADITIVA: pode rodar múltiplas vezes; nunca DROP.
-- Aplicar em produção só com pg_dump feito e verificado.

CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    product_key TEXT NOT NULL,          -- cimi_360 | cimi_invest | indip | feirao | reuniao
    group_name TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,                 -- link | evento
    language TEXT,                      -- NULL | PT | ENG | ESP
    url TEXT,
    meta JSONB NOT NULL DEFAULT '{}',   -- {"date":"...","location":"..."} para evento
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_key, group_name, label, language)
);

CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    product_key TEXT NOT NULL,
    name TEXT NOT NULL,                 -- ex. "Texto padrão"
    body TEXT NOT NULL,                 -- placeholders {nome} {primeiro_nome} {evento} {produto}
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_key, name)
);

-- Índices de leitura: GET /api/materials filtra active e ordena por sort_order.
CREATE INDEX IF NOT EXISTS ix_materials_active ON materials (active);
CREATE INDEX IF NOT EXISTS ix_materials_product_group_order
    ON materials (product_key, group_name, sort_order);
CREATE INDEX IF NOT EXISTS ix_message_templates_product_active
    ON message_templates (product_key, active);
