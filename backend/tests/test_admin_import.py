"""Testes do endpoint POST /api/admin/contacts/import-google-csv
(app.routers.admin.import_google_contacts_csv), chamado diretamente com db
mockado — ScannedContact usa ARRAY(String) e não roda em SQLite.

Foco: relatório (created/skipped/invalid), dedup contra a base existente e
dedup dentro do PRÓPRIO arquivo (duas linhas iguais no mesmo CSV).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_admin_import.py -v
"""

from __future__ import annotations

import csv
import io
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.routers.admin import import_google_contacts_csv

NEW_LAYOUT_FIELDS = [
    "First Name",
    "Last Name",
    "Organization Name",
    "Organization Title",
    "Notes",
    "Labels",
    "E-mail 1 - Value",
    "Phone 1 - Value",
]


def _build_csv(rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=NEW_LAYOUT_FIELDS, restval="")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue()


def _upload(csv_text: str) -> MagicMock:
    up = MagicMock()
    up.read = AsyncMock(return_value=csv_text.encode("utf-8"))
    return up


def _db_with_existing(existing_rows: list[tuple]):
    """db.execute retorna, na 1ª chamada, os existentes normalizados
    (id, phone_e164, email_norm). commits são no-op."""
    existing_result = MagicMock()
    existing_result.all.return_value = existing_rows

    db = AsyncMock()
    db.execute = AsyncMock(return_value=existing_result)
    db.add_all = MagicMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_dry_run_counts_created_and_skips_existing():
    csv_text = _build_csv(
        [
            {"First Name": "Novo", "Labels": "* myContacts", "E-mail 1 - Value": "novo@example.com"},
            {"First Name": "Existente", "Labels": "* myContacts", "E-mail 1 - Value": "ja@example.com"},
        ]
    )
    # 'ja@example.com' já existe na base
    db = _db_with_existing([(99, None, "ja@example.com")])

    out = await import_google_contacts_csv(file=_upload(csv_text), dry_run=True, db=db)

    assert out["created"] == 1
    assert out["skipped"] == 1
    assert out["dry_run"] is True
    # dry_run não grava
    db.add_all.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_dedup_within_same_file():
    """Duas linhas com o mesmo e-mail no MESMO arquivo: só a 1ª conta como
    created; a 2ª é skipped (mesmo sem commit entre elas)."""
    csv_text = _build_csv(
        [
            {"First Name": "Um", "Labels": "* myContacts", "E-mail 1 - Value": "igual@example.com"},
            {"First Name": "Dois", "Labels": "* myContacts", "E-mail 1 - Value": "igual@example.com"},
        ]
    )
    db = _db_with_existing([])

    out = await import_google_contacts_csv(file=_upload(csv_text), dry_run=True, db=db)

    assert out["created"] == 1
    assert out["skipped"] == 1


@pytest.mark.asyncio
async def test_invalid_row_without_phone_or_email():
    csv_text = _build_csv(
        [{"First Name": "SemContato", "Labels": "* myContacts"}]
    )
    db = _db_with_existing([])

    out = await import_google_contacts_csv(file=_upload(csv_text), dry_run=True, db=db)

    assert out["created"] == 0
    assert out["invalid"] == 1
    assert out["errors"] and out["errors"][0]["reason"]


@pytest.mark.asyncio
async def test_personal_labels_skipped():
    csv_text = _build_csv(
        [
            {"First Name": "Parente", "Labels": "* family", "E-mail 1 - Value": "fam@example.com"},
            {"First Name": "Lead", "Labels": "* myContacts", "E-mail 1 - Value": "lead@example.com"},
        ]
    )
    db = _db_with_existing([])

    out = await import_google_contacts_csv(file=_upload(csv_text), dry_run=True, db=db)

    # 'family' é filtrado no parser; só o lead entra
    assert out["created"] == 1


@pytest.mark.asyncio
async def test_real_import_commits_in_batch():
    csv_text = _build_csv(
        [{"First Name": "Grava", "Labels": "* myContacts", "Phone 1 - Value": "(11) 98765-4321"}]
    )
    db = _db_with_existing([])

    out = await import_google_contacts_csv(file=_upload(csv_text), dry_run=False, db=db)

    assert out["created"] == 1
    db.add_all.assert_called_once()
    db.commit.assert_awaited()
