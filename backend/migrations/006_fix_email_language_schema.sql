-- Etapa 1.5: corrige email_language para VARCHAR(10) (compatível com "pt-BR")
-- Coluna criada na migration 005 como VARCHAR(2) — ainda vazia, sem dados a migrar.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scanned_contacts'
          AND column_name = 'email_language'
          AND character_maximum_length = 2
    ) THEN
        -- Verifica que a coluna está vazia antes de alterar
        IF (SELECT COUNT(*) FROM scanned_contacts WHERE email_language IS NOT NULL) > 0 THEN
            RAISE EXCEPTION 'email_language já contém dados — interromper e pedir orientação';
        END IF;

        ALTER TABLE scanned_contacts
            ALTER COLUMN email_language TYPE VARCHAR(10);
    END IF;
END $$;
