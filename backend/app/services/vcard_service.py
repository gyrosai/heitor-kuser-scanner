from typing import List

import vobject

from app.models import ContactData


def generate_vcard(contact: ContactData) -> str:
    """Gera string vCard 3.0 a partir dos dados de contato."""
    vcard = vobject.vCard()

    vcard.add("fn").value = contact.name

    name_parts = contact.name.split(" ", 1)
    n = vcard.add("n")
    if len(name_parts) >= 2:
        n.value = vobject.vcard.Name(family=name_parts[1], given=name_parts[0])
    else:
        n.value = vobject.vcard.Name(family=name_parts[0], given="")

    if contact.phone:
        tel = vcard.add("tel")
        tel.value = contact.phone
        tel.type_param = "CELL"

    if contact.email:
        email = vcard.add("email")
        email.value = contact.email
        email.type_param = "INTERNET"

    if contact.company:
        vcard.add("org").value = [contact.company]

    if contact.role:
        vcard.add("title").value = contact.role

    if contact.website:
        vcard.add("url").value = contact.website

    notes_parts: List[str] = []
    if contact.event_tag:
        notes_parts.append(f"Evento: {contact.event_tag}")
    if contact.notes:
        notes_parts.append(contact.notes)
    if notes_parts:
        vcard.add("note").value = " | ".join(notes_parts)

    return vcard.serialize()
