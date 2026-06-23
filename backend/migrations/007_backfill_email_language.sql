-- Idempotente: só copia onde email_language ainda está NULL
UPDATE scanned_contacts
SET email_language = idioma_email
WHERE idioma_email IS NOT NULL
  AND email_language IS NULL;
