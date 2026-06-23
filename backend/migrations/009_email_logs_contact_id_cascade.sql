-- contact_id is already nullable; ensure it, then rebuild FK with ON DELETE SET NULL
ALTER TABLE email_logs ALTER COLUMN contact_id DROP NOT NULL;

ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_contact_id_fkey;
ALTER TABLE email_logs
    ADD CONSTRAINT email_logs_contact_id_fkey
    FOREIGN KEY (contact_id)
    REFERENCES scanned_contacts(id)
    ON DELETE SET NULL;
