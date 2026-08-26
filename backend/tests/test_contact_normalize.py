from __future__ import annotations

import pytest

from app.services.contact_normalize import email_normalize, phone_to_e164


class TestPhoneToE164:
    def test_br_mobile_with_nine(self):
        assert phone_to_e164("(11) 98765-4321") == "+5511987654321"

    def test_br_mobile_with_ddi(self):
        assert phone_to_e164("+55 11 98765-4321") == "+5511987654321"

    def test_invalid_phone(self):
        assert phone_to_e164("abc") is None

    def test_none(self):
        assert phone_to_e164(None) is None

    def test_empty(self):
        assert phone_to_e164("") is None

    def test_landline(self):
        assert phone_to_e164("(11) 3456-7890") == "+551134567890"


class TestEmailNormalize:
    def test_simple(self):
        assert email_normalize("Foo@Example.COM") == "foo@example.com"

    def test_none(self):
        assert email_normalize(None) is None

    def test_empty(self):
        assert email_normalize("  ") is None
