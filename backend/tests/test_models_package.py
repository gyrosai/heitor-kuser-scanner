"""Testes de ContactData/SendEmailRequest.package (PackageSelection).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_models_package.py -v
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models import ContactData, SendEmailRequest


def test_contact_data_package_absent_is_legacy():
    contact = ContactData(name="Fulano")
    assert contact.package is None


def test_contact_data_package_valid_product_key():
    contact = ContactData(
        name="Fulano",
        package={"product_key": "cimi_360", "material_ids": [1, 2]},
    )
    assert contact.package is not None
    assert contact.package.product_key == "cimi_360"
    assert contact.package.material_ids == [1, 2]
    assert contact.package.template_id is None


def test_contact_data_package_invalid_product_key_raises_422():
    with pytest.raises(ValidationError):
        ContactData(name="Fulano", package={"product_key": "produto_inexistente"})


@pytest.mark.parametrize(
    "product_key",
    ["cimi_360", "cimi_invest", "leilao", "indip", "feirao", "reuniao"],
)
def test_all_catalog_product_keys_are_valid(product_key):
    contact = ContactData(name="Fulano", package={"product_key": product_key})
    assert contact.package.product_key == product_key


def test_send_email_request_package_optional():
    req = SendEmailRequest()
    assert req.package is None

    req_with_package = SendEmailRequest(
        package={"product_key": "leilao", "material_ids": [5], "template_id": 3}
    )
    assert req_with_package.package.product_key == "leilao"
    assert req_with_package.package.template_id == 3
