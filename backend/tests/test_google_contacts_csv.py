from __future__ import annotations

from app.services.google_contacts_csv import parse_google_contacts_csv


NEW_LAYOUT_HEADER = """First Name,Middle Name,Last Name,Phonetic First Name,Phonetic Middle Name,Phonetic Last Name,Name Prefix,Name Suffix,Nickname,File As,Organization Name,Organization Title,Organization Department,Birthday,Notes,Photo,Labels,E-mail 1 - Label,E-mail 1 - Value,Phone 1 - Label,Phone 1 - Value,Website 1 - Label,Website 1 - Value"""


def test_only_email():
    csv_text = NEW_LAYOUT_HEADER + "\n" + "João,,Silva,,,,,,,,,,,,,,* myContacts ::: Governo ::: MIPIM 2026 contacts,,joao@example.com,,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "João Silva"
    assert r.emails == ["joao@example.com"]
    assert r.phones == []
    assert r.labels == ["Governo", "MIPIM 2026 contacts"]


def test_only_phone_no_ddi():
    csv_text = NEW_LAYOUT_HEADER + "\n" + "Maria,,,,,,,,,,,,,,,,* myContacts,,,Mobile,(11) 98765-4321,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Maria"
    assert r.phones == ["(11) 98765-4321"]
    assert r.emails == []


def test_duplicate_of_existing_skipped_by_dedup_in_endpoint():
    # Parser não faz dedup — só retorna os dados
    csv_text = NEW_LAYOUT_HEADER + "\n" + "Duplicado,,,,,,,,,,,,,,,,* myContacts,,,dupe@example.com,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    assert rows[0].emails == ["dupe@example.com"]


def test_no_name_uses_email():
    csv_text = NEW_LAYOUT_HEADER + "\n" + ",,,,,,,,,,,,,,,,* myContacts,,,semnome@example.com,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "semnome@example.com"
    assert "nome ausente" in r.warnings[0]


def test_two_labels():
    csv_text = NEW_LAYOUT_HEADER + "\n" + "Ana,,,,,,,,,,Empresa X,Diretora,,,,* myContacts ::: Banco ::: Parceiro,,ana@example.com,,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Ana"
    assert r.company == "Empresa X"
    assert r.role == "Diretora"
    assert r.labels == ["Banco", "Parceiro"]


def test_skip_personal():
    csv_text = NEW_LAYOUT_HEADER + "\n" + "Irmão,,,,,,,,,,,,,,,,* family ::: Pessoal,,irmao@example.com,,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 0


def test_bom_tolerated():
    csv_text = "\ufeff" + NEW_LAYOUT_HEADER + "\n" + "João,,,,,,,,,,,,,,,,* myContacts,,,joao@example.com,,,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    assert rows[0].name == "João"


def test_multiple_emails():
    header = NEW_LAYOUT_HEADER + ",E-mail 2 - Label,E-mail 2 - Value"
    csv_text = header + "\n" + "João,,,,,,,,,,,,,,,,* myContacts,,joao@example.com,,,,,joao2@example.com,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.emails == ["joao@example.com", "joao2@example.com"]
    assert "Outros emails: joao2@example.com" in r.notes


def test_multiple_phones():
    header = NEW_LAYOUT_HEADER + ",Phone 2 - Label,Phone 2 - Value"
    csv_text = header + "\n" + "João,,,,,,,,,,,,,,,,* myContacts,,,Mobile,(11) 98765-4321,,Mobile,(11) 3456-7890,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.phones == ["(11) 98765-4321", "(11) 3456-7890"]
    assert "Outros telefones" in r.notes


def test_old_layout_detected():
    header = "Given Name,Family Name,E-mail 1 - Value,Phone 1 - Value,Organization 1 - Name,Organization 1 - Title,Labels,Notes"
    csv_text = header + "\n" + "Carlos,Silva,carlos@example.com,(11) 98765-4321,Empresa,CEO,* myContacts ::: Governo,"
    rows = parse_google_contacts_csv(csv_text)
    assert len(rows) == 1
    r = rows[0]
    assert r.name == "Carlos Silva"
    assert r.company == "Empresa"
    assert r.role == "CEO"
    assert r.labels == ["Governo"]
