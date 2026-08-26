#!/usr/bin/env python3
"""Backfill idempotente: preenche phone_e164 e email_norm dos registros existentes.

Uso:
    python scripts/backfill_normalized_contact_fields.py --dry-run
    python scripts/backfill_normalized_contact_fields.py --apply

Requer variável de ambiente DATABASE_URL (ou usa SQLite local se não definida).
"""

import argparse
import asyncio
import logging
import os
import sys

# Injetar app no path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db_models import ScannedContact
from app.services.contact_normalize import email_normalize, phone_to_e164

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")


async def main(dry_run: bool) -> None:
    if DATABASE_URL is None:
        logger.error("DATABASE_URL não definida")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(ScannedContact).where(
                (ScannedContact.phone_e164.is_(None))
                & (ScannedContact.phone.isnot(None))
            )
        )
        phone_rows = result.scalars().all()

        result = await session.execute(
            select(ScannedContact).where(
                (ScannedContact.email_norm.is_(None))
                & (ScannedContact.email.isnot(None))
            )
        )
        email_rows = result.scalars().all()

        phone_updates: list[tuple[int, str]] = []
        email_updates: list[tuple[int, str]] = []

        for row in phone_rows:
            normalized = phone_to_e164(row.phone)
            if normalized:
                phone_updates.append((row.id, normalized))
            else:
                logger.warning("Telefone inválido (id=%s): %r", row.id, row.phone)

        for row in email_rows:
            normalized = email_normalize(row.email)
            if normalized:
                email_updates.append((row.id, normalized))
            else:
                logger.warning("Email inválido (id=%s): %r", row.id, row.email)

        logger.info("Telefones a normalizar: %s", len(phone_updates))
        logger.info("Emails a normalizar: %s", len(email_updates))

        if dry_run:
            logger.info("DRY-RUN — nenhuma alteração foi feita.")
            logger.info("Primeiros 10 telefones: %s", phone_updates[:10])
            logger.info("Primeiros 10 emails: %s", email_updates[:10])
            return

        for contact_id, val in phone_updates:
            await session.execute(
                update(ScannedContact)
                .where(ScannedContact.id == contact_id)
                .values(phone_e164=val)
            )
        for contact_id, val in email_updates:
            await session.execute(
                update(ScannedContact)
                .where(ScannedContact.id == contact_id)
                .values(email_norm=val)
            )

        await session.commit()
        logger.info("Backfill aplicado: %s telefones + %s emails.", len(phone_updates), len(email_updates))

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--apply", action="store_true", dest="apply")
    args = parser.parse_args()
    dry_run = not args.apply
    asyncio.run(main(dry_run))
