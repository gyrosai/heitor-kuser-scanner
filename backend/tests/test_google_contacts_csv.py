from __future__ import annotations

import csv
import io

from app.services.google_contacts_csv import parse_google_contacts_csv

# Cabeçalho do layout novo do Google Contacts (export atual).
NEW_LAYOUT_FIELDS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Phonetic First Name",
    "Phonetic Middle Name",
    "Phonetic Last Name",
    "Name Prefix",
    "Name Suffix",
    "Nickname",
    "File As",
    "Organization Name",
    "Organization Title",
    "Organization Department",
    "Birthday",
    "Notes",
    "Photo",
    "Labels",
    "E-mail 1 - Label",
    "E-mail 1 - Value",
    "Phone 1 - Label",
    "Phone 1 - Value",
    "Website 1 - Label",
    "Website 1 - Value",
]

OLD_LAYOUT_FIELDS = [
    "Given Name",
    "Family Name",
    "E-mail 1 - Value",
    "Phone 1 - Value",
    "Organization 1 - Name",
    "Organization 1 - Title",
    "Labels",
    "Notes",
]


def _build_csv(
    rows: list[dict],
    fields: list[str] = NEW_LAYOUT_FIELDS,
    extra_fields: list[str] | None = None,
) -> str:
    """Monta um CSV do Google Contacts a partir de dicts (via DictWriter).

    Evita contagem manual de vírgulas em string — fonte de bugs de
    alinhamento de coluna quando o CSV é escrito à mão. Colunas ausentes em
    cada `row` viram string vazia (`restval=""`), igual ao export real.
    """
    fieldnames = fields + (extra_fields or [])
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, restval="")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue()


def test_only_email():
    csv_text = _build_csv(
        [
            {
                "First Name": "João",
                "Last Name": "Silva",
                "Labels": "* myContacts ::: Governo ::: MIPIM 2026 contacts",
                "E-mail 1 - Value": "joao@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "João Silva"
    assert r.emails == ["joao@example.com"]
    assert r.phones == []
    assert r.labels == ["Governo", "MIPIM 2026 contacts"]


def test_only_phone_no_ddi():
    csv_text = _build_csv(
        [
            {
                "First Name": "Maria",
                "Labels": "* myContacts",
                "Phone 1 - Label": "Mobile",
                "Phone 1 - Value": "(11) 98765-4321",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Maria"
    assert r.phones == ["(11) 98765-4321"]
    assert r.emails == []


def test_duplicate_of_existing_skipped_by_dedup_in_endpoint():
    # Parser não faz dedup — só retorna os dados; dedup é feito no endpoint.
    csv_text = _build_csv(
        [
            {
                "First Name": "Duplicado",
                "Labels": "* myContacts",
                "E-mail 1 - Value": "dupe@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    assert rows[0].emails == ["dupe@example.com"]


def test_no_name_uses_email():
    csv_text = _build_csv(
        [
            {
                "Labels": "* myContacts",
                "E-mail 1 - Value": "semnome@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "semnome@example.com"
    assert "nome ausente" in r.warnings[0]


def test_no_name_no_email_no_phone_falls_back_to_sem_nome():
    """Linha sem nome, e-mail ou telefone não deve crashar (IndexError)."""
    csv_text = _build_csv(
        [
            {
                "Labels": "* myContacts",
                "Organization Name": "Empresa Sem Contato",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Empresa Sem Contato"
    assert "nome ausente" in r.warnings[0]


def test_no_name_no_email_no_phone_no_org_uses_sem_nome():
    csv_text = _build_csv([{"Labels": "* myContacts"}])
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Sem nome"
    assert "nome ausente" in r.warnings[0]


def test_two_labels():
    csv_text = _build_csv(
        [
            {
                "First Name": "Ana",
                "Organization Name": "Empresa X",
                "Organization Title": "Diretora",
                "Labels": "* myContacts ::: Banco ::: Parceiro",
                "E-mail 1 - Value": "ana@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Ana"
    assert r.company == "Empresa X"
    assert r.role == "Diretora"
    assert r.labels == ["Banco", "Parceiro"]


def test_skip_personal():
    csv_text = _build_csv(
        [
            {
                "First Name": "Irmão",
                "Labels": "* family ::: Pessoal",
                "E-mail 1 - Value": "irmao@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 0


def test_bom_tolerated():
    csv_text = "\ufeff" + _build_csv(
        [
            {
                "First Name": "João",
                "Labels": "* myContacts",
                "E-mail 1 - Value": "joao@example.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    assert rows[0].name == "João"


def test_multiple_emails():
    csv_text = _build_csv(
        [
            {
                "First Name": "João",
                "Labels": "* myContacts",
                "E-mail 1 - Value": "joao@example.com",
                "E-mail 2 - Value": "joao2@example.com",
            }
        ],
        extra_fields=["E-mail 2 - Label", "E-mail 2 - Value"],
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.emails == ["joao@example.com", "joao2@example.com"]
    assert "Outros e-mails: joao2@example.com" in r.notes


def test_multiple_phones():
    csv_text = _build_csv(
        [
            {
                "First Name": "João",
                "Labels": "* myContacts",
                "Phone 1 - Label": "Mobile",
                "Phone 1 - Value": "(11) 98765-4321",
                "Phone 2 - Label": "Mobile",
                "Phone 2 - Value": "(11) 3456-7890",
            }
        ],
        extra_fields=["Phone 2 - Label", "Phone 2 - Value"],
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.phones == ["(11) 98765-4321", "(11) 3456-7890"]
    assert "Outros telefones" in r.notes


def test_three_phones_in_single_cell_split():
    """Google junta vários telefones na MESMA célula com ' ::: '. O primeiro
    que normaliza vira o primário; os demais vão para notes."""
    csv_text = _build_csv(
        [
            {
                "First Name": "Multi",
                "Labels": "* myContacts",
                "Phone 1 - Label": "Mobile",
                "Phone 1 - Value": "(11) 98765-4321 ::: (21) 3456-7890 ::: (11) 91234-5678",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    # Célula única virou 3 números isolados (nenhum contém ' ::: ')
    assert r.phones == ["(11) 98765-4321", "(21) 3456-7890", "(11) 91234-5678"]
    assert all(" ::: " not in p for p in r.phones)
    # Primário isolado + os outros em notes
    assert "Outros telefones: (21) 3456-7890, (11) 91234-5678" in r.notes


def test_multiple_websites_split_to_notes():
    csv_text = _build_csv(
        [
            {
                "First Name": "Site",
                "Labels": "* myContacts",
                "E-mail 1 - Value": "site@example.com",
                "Website 1 - Value": "https://a.com ::: https://b.com",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.websites == ["https://a.com", "https://b.com"]
    assert "Outros sites: https://b.com" in r.notes


def test_first_normalizable_phone_becomes_primary():
    """Se o 1º número não normaliza mas o 2º sim, o normalizável vira primário
    (garante coerência entre `phone` e `phone_e164`)."""
    csv_text = _build_csv(
        [
            {
                "First Name": "Ordem",
                "Labels": "* myContacts",
                "Phone 1 - Value": "ramal 22 ::: (11) 98765-4321",
            }
        ]
    )
    rows = parse_google_contacts_csv(csv_text)
    r = rows[0]
    assert r.phones[0] == "(11) 98765-4321"
    assert "ramal 22" in r.notes


def test_old_layout_detected():
    csv_text = _build_csv(
        [
            {
                "Given Name": "Carlos",
                "Family Name": "Silva",
                "E-mail 1 - Value": "carlos@example.com",
                "Phone 1 - Value": "(11) 98765-4321",
                "Organization 1 - Name": "Empresa",
                "Organization 1 - Title": "CEO",
                "Labels": "* myContacts ::: Governo",
            }
        ],
        fields=OLD_LAYOUT_FIELDS,
    )
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Carlos Silva"
    assert r.company == "Empresa"
    assert r.role == "CEO"
    assert r.labels == ["Governo"]
