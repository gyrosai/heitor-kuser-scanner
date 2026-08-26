from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass

from app.services.contact_normalize import email_normalize

logger = logging.getLogger(__name__)

# Marcadores de contatos pessoais que devem ser ignorados
PERSONAL_LABELS = {"* family", "parente", "amigo"}

# Marcadores do próprio Google que não são labels úteis
GOOGLE_SYSTEM_LABELS = {"* mycontacts", "* starred", "importado em", "importado"}

# Layouts suportados
NEW_LAYOUT_HEADERS = {"First Name", "Last Name", "Organization Name", "Organization Title"}
OLD_LAYOUT_HEADERS = {"Given Name", "Family Name", "Organization 1 - Name"}


@dataclass
class ContactImportRow:
    name: str
    company: str | None
    role: str | None
    phones: list[str]
    emails: list[str]
    notes: str | None
    labels: list[str]
    warnings: list[str]


def _detect_layout(fieldnames: list[str]) -> str:
    fields_set = set(fieldnames)
    if NEW_LAYOUT_HEADERS & fields_set:
        return "new"
    if OLD_LAYOUT_HEADERS & fields_set:
        return "old"
    return "unknown"


def _extract_name(row: dict, layout: str) -> tuple[str, bool]:
    """Retorna (nome, usou_fallback).

    `usou_fallback=True` quando o nome não veio dos campos reais de nome
    (First/Last Name ou Given/Family Name) — ou seja, veio de File As,
    Organization Name, e-mail, telefone ou "Sem nome". Usado para decidir se
    emite o warning de "nome ausente".
    """
    if layout == "new":
        parts = [
            row.get("First Name", "").strip(),
            row.get("Middle Name", "").strip(),
            row.get("Last Name", "").strip(),
        ]
        name = " ".join(p for p in parts if p)
        if name:
            return name, False
        # Fallbacks
        for key in ("File As", "Organization Name"):
            val = row.get(key, "").strip()
            if val:
                return val, True
    elif layout == "old":
        parts = [
            row.get("Given Name", "").strip(),
            row.get("Family Name", "").strip(),
        ]
        name = " ".join(p for p in parts if p)
        if name:
            return name, False
    # Último fallback: e-mail ou telefone
    emails = _extract_emails(row)
    phones = _extract_phones(row)
    email = emails[0] if emails else None
    phone = phones[0] if phones else None
    return (email or phone or "Sem nome"), True


def _extract_emails(row: dict) -> list[str]:
    emails: list[str] = []
    for key in sorted(k for k in row if k is not None):
        if key.startswith("E-mail") and key.endswith(" - Value"):
            val = row.get(key, "").strip()
            if val:
                norm = email_normalize(val)
                if norm and norm not in emails:
                    emails.append(norm)
    # Layout antigo
    if not emails:
        for key in ("E-mail 1 - Value", "E-mail 2 - Value", "E-mail 3 - Value"):
            val = row.get(key, "").strip()
            if val:
                norm = email_normalize(val)
                if norm and norm not in emails:
                    emails.append(norm)
    return emails


def _extract_phones(row: dict) -> list[str]:
    phones: list[str] = []
    for key in sorted(k for k in row if k is not None):
        if key.startswith("Phone") and key.endswith(" - Value"):
            val = row.get(key, "").strip()
            if val:
                phones.append(val)
    # Layout antigo
    if not phones:
        for key in ("Phone 1 - Value", "Phone 2 - Value", "Phone 3 - Value"):
            val = row.get(key, "").strip()
            if val:
                phones.append(val)
    return phones


def _extract_company(row: dict, layout: str) -> str | None:
    if layout == "new":
        return row.get("Organization Name", "").strip() or None
    return row.get("Organization 1 - Name", "").strip() or None


def _extract_role(row: dict, layout: str) -> str | None:
    if layout == "new":
        return row.get("Organization Title", "").strip() or None
    return row.get("Organization 1 - Title", "").strip() or None


def _extract_notes(row: dict) -> str | None:
    return row.get("Notes", "").strip() or None


def _extract_labels(row: dict) -> list[str]:
    raw = row.get("Labels", "").strip()
    if not raw:
        return []
    labels = [l.strip() for l in raw.split(" ::: ") if l.strip()]
    return labels


def _should_skip(labels: list[str]) -> bool:
    lower = {l.lower() for l in labels}
    return bool(PERSONAL_LABELS & lower)


def _filter_import_labels(labels: list[str]) -> list[str]:
    """Remove labels de sistema do Google e import genéricos."""
    result: list[str] = []
    for label in labels:
        lower = label.lower()
        if lower.startswith("* ") and lower in GOOGLE_SYSTEM_LABELS:
            continue
        if lower.startswith("importado"):
            continue
        result.append(label)
    return result


def parse_google_contacts_csv(file_content: str) -> list[ContactImportRow]:
    """Parseia CSV do Google Contacts (layout novo ou antigo).

    Tolerante a BOM, quebras de linha em Notes, colunas ausentes.
    Retorna lista de ContactImportRow; contatos pessoais são omitidos.
    """
    # Remove BOM se houver
    file_content = file_content.removeprefix("\ufeff")

    reader = csv.DictReader(io.StringIO(file_content))
    if not reader.fieldnames:
        logger.error("CSV sem cabeçalho")
        return []

    layout = _detect_layout(reader.fieldnames)
    if layout == "unknown":
        logger.warning("Layout não reconhecido; tentando heurística genérica")

    rows: list[ContactImportRow] = []
    for i, row in enumerate(reader, start=2):
        labels = _extract_labels(row)
        if _should_skip(labels):
            logger.debug("Linha %s ignorada (pessoal): %s", i, labels)
            continue

        import_labels = _filter_import_labels(labels)
        emails = _extract_emails(row)
        phones = _extract_phones(row)
        name, name_is_fallback = _extract_name(row, layout)
        warnings: list[str] = []

        if name_is_fallback:
            warnings.append("nome ausente; usado email/telefone como provisório")

        company = _extract_company(row, layout)
        role = _extract_role(row, layout)
        notes = _extract_notes(row)

        # Adiciona outros contatos em notes
        extra_emails = emails[1:]
        extra_phones = phones[1:]
        if extra_emails or extra_phones:
            extras: list[str] = []
            if extra_emails:
                extras.append(f"Outros emails: {', '.join(extra_emails)}")
            if extra_phones:
                extras.append(f"Outros telefones: {', '.join(extra_phones)}")
            extra_note = "\n".join(extras)
            if notes:
                notes = f"{notes}\n{extra_note}"
            else:
                notes = extra_note

        # Adiciona labels em notes
        if import_labels:
            label_note = f"Marcadores: {', '.join(import_labels)}"
            if notes:
                notes = f"{notes}\n{label_note}"
            else:
                notes = label_note

        rows.append(
            ContactImportRow(
                name=name,
                company=company,
                role=role,
                phones=phones,
                emails=emails,
                notes=notes,
                labels=import_labels,
                warnings=warnings,
            )
        )

    return rows
