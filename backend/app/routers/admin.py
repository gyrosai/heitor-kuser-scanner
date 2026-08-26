from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import ScannedContact
from app.services.contact_normalize import email_normalize, phone_to_e164
from app.services.google_contacts_csv import ContactImportRow, parse_google_contacts_csv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin")

# Token simples via header — substituir por algo mais robusto se necessário
ADMIN_TOKEN = "heitor-import-2024"  # placeholder; usar env var em produção


async def _verify_admin_token(x_admin_token: str = Header(..., alias="X-Admin-Token")) -> None:
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Token inválido")


def _is_imported_duplicate(
    row: ContactImportRow, existing: ScannedContact
) -> bool:
    """Verifica se um contato importado já existe (por phone_e164 ou email_norm)."""
    if row.emails and existing.email_norm:
        for email in row.emails:
            if email_normalize(email) == existing.email_norm:
                return True
    if row.phones and existing.phone_e164:
        for phone in row.phones:
            norm = phone_to_e164(phone)
            if norm and norm == existing.phone_e164:
                return True
    return False


@router.post("/contacts/import-google-csv")
async def import_google_contacts_csv(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _=Depends(_verify_admin_token),
) -> dict:
    """Importa contatos do Google Contacts CSV para scanned_contacts.

    - Idempotente: rodar 2x não duplica (checa phone_e164/email_norm).
    - Contatos pessoais (family, parente, amigo) são ignorados.
    - Lote de 500 com commit por lote.
    - Falha em uma linha não aborta o arquivo.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # tolera BOM
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Arquivo não é UTF-8 válido")

    rows = parse_google_contacts_csv(text)

    created = 0
    skipped = 0
    invalid = 0
    skipped_personal = 0
    errors: list[dict] = []
    skipped_details: list[dict] = []

    # Pré-carrega todos os existentes normalizados para dedup rápido
    # (para 8.900 registros, isso é mais eficiente que N queries)
    existing_result = await db.execute(
        select(ScannedContact.id, ScannedContact.phone_e164, ScannedContact.email_norm)
    )
    existing_by_phone: dict[str, int] = {}
    existing_by_email: dict[str, int] = {}
    for row_id, phone_e164, email_norm in existing_result.all():
        if phone_e164:
            existing_by_phone[phone_e164] = row_id
        if email_norm:
            existing_by_email[email_norm] = row_id

    batch_size = 500
    batch: list[ScannedContact] = []

    for idx, row in enumerate(rows, start=1):
        # Skip pessoal (já filtrado no parser, mas garante)
        if any(l.lower() in {"* family", "parente", "amigo"} for l in row.labels):
            skipped_personal += 1
            continue

        # Resolve telefone e email principal
        phone_e164 = None
        for p in row.phones:
            norm = phone_to_e164(p)
            if norm:
                phone_e164 = norm
                break

        email_norm_val = None
        for e in row.emails:
            norm = email_normalize(e)
            if norm:
                email_norm_val = norm
                break

        if not phone_e164 and not email_norm_val:
            invalid += 1
            errors.append({"line": idx, "reason": "sem telefone/email válido"})
            continue

        # Dedup
        dup_id = None
        if phone_e164 and phone_e164 in existing_by_phone:
            dup_id = existing_by_phone[phone_e164]
        elif email_norm_val and email_norm_val in existing_by_email:
            dup_id = existing_by_email[email_norm_val]

        if dup_id is not None:
            skipped += 1
            if len(skipped_details) < 20:
                skipped_details.append({"line": idx, "existing_id": dup_id, "reason": "duplicado"})
            continue

        if dry_run:
            created += 1
            continue

        # Cria contato importado
        contact = ScannedContact(
            name=row.name,
            company=row.company,
            role=row.role,
            phone=row.phones[0] if row.phones else None,
            phone_e164=phone_e164,
            email=row.emails[0] if row.emails else None,
            email_norm=email_norm_val,
            notes=row.notes,
            source="base_heitor",
            is_draft=False,
            importance=1,
            tags=[],
            import_labels=row.labels,
            scanned_at=datetime.now(timezone.utc),
        )
        batch.append(contact)

        if len(batch) >= batch_size:
            db.add_all(batch)
            await db.commit()
            for c in batch:
                if c.phone_e164:
                    existing_by_phone[c.phone_e164] = c.id
                if c.email_norm:
                    existing_by_email[c.email_norm] = c.id
            created += len(batch)
            batch = []

    if batch and not dry_run:
        db.add_all(batch)
        await db.commit()
        for c in batch:
            if c.phone_e164:
                existing_by_phone[c.phone_e164] = c.id
            if c.email_norm:
                existing_by_email[c.email_norm] = c.id
        created += len(batch)

    return {
        "created": created,
        "skipped": skipped,
        "invalid": invalid,
        "skipped_personal": skipped_personal,
        "errors": errors,
        "skipped_details": skipped_details,
        "dry_run": dry_run,
    }
