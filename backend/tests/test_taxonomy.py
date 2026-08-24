"""Testes para a taxonomia e validação de classificação.

Rodar com:
    cd backend && uv run pytest tests/test_taxonomy.py -v
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models import ContactData
from app.taxonomy import (
    ALLOWED_TAGS_SET,
    INTEREST_TYPES,
    PRODUCTS,
    format_csv_columns,
    get_product_label,
    get_profile_label,
    get_taxonomy_payload,
    is_valid_classification,
    parse_classification_tags,
)


class TestTaxonomyStructure:
    """Garante que o JSON de taxonomia foi carregado corretamente."""

    def test_products_count_and_order(self):
        keys = [p["key"] for p in PRODUCTS]
        assert keys == ["cimi_360", "cimi_invest", "leilao", "indip", "feirao"]

    def test_interest_types_includes_new_and_old(self):
        assert "Instrutor" in INTEREST_TYPES
        assert "Palestrante" in INTEREST_TYPES
        assert "Associação" in INTEREST_TYPES
        assert "Município" in INTEREST_TYPES

    def test_allowed_tags_set(self):
        assert "Instrutor" in ALLOWED_TAGS_SET
        assert "Palestrante" in ALLOWED_TAGS_SET

    def test_legacy_profiles_present(self):
        payload = get_taxonomy_payload()
        legacy = payload.get("legacy_profiles", {})
        assert "cimi_invest" in legacy
        slugs = {p["slug"] for p in legacy["cimi_invest"]}
        assert slugs == {"parceria", "venda"}

    def test_cimi_invest_has_eight_profiles(self):
        invest = next(p for p in PRODUCTS if p["key"] == "cimi_invest")
        assert len(invest["profiles"]) == 8
        slugs = {pr["slug"] for pr in invest["profiles"]}
        assert "investidor" in slugs
        assert "empreendedor" in slugs


class TestValidation:
    """Validação Pydantic para classificação e tags de interesse."""

    @pytest.mark.parametrize(
        "tag",
        [
            "cimi_360:stand",
            "cimi_360:patrocinio",
            "cimi_invest:investidor",
            "cimi_invest:empreendedor",
            "cimi_invest:parceiro",
            "cimi_invest:associacao",
            "leilao:comprador",
            "leilao:municipio",
            "indip:estado",
            "feirao:t_e_i",
            "feirao:incorporadora_internacional",
            "cimi_invest:parceria",  # legacy aceito
            "cimi_invest:venda",  # legacy aceito
        ],
    )
    def test_valid_classification_tags_accepted(self, tag: str):
        c = ContactData(name="Test", tags=[tag])
        assert tag in c.tags

    @pytest.mark.parametrize(
        "tag,expected_substring",
        [
            ("leilao:investidor", "investidor"),  # perfil de outro produto
            ("cimi_invest:stand", "stand"),  # perfil de outro produto
            ("produto_desconhecido:foo", "produto_desconhecido"),  # produto desconhecido
            ("cimi_360:foo_bar", "foo_bar"),  # perfil inexistente
        ],
    )
    def test_invalid_classification_raises_422(self, tag: str, expected_substring: str):
        with pytest.raises(ValidationError) as exc_info:
            ContactData(name="Test", tags=[tag])
        assert expected_substring in str(exc_info.value)

    def test_payload_without_tags_saves(self):
        c = ContactData(name="Test")
        assert c.tags == []

    def test_payload_with_none_tags_saves(self):
        c = ContactData(name="Test", tags=None)
        assert c.tags == []

    def test_unknown_interest_tag_filtered_with_warning(self, caplog):
        import logging

        with caplog.at_level(logging.WARNING, logger="app.models"):
            c = ContactData(name="Test", tags=["TagInexistente"])
        assert c.tags == []
        assert "TagInexistente" in caplog.text

    def test_mixed_valid_and_invalid_classification(self):
        # classificação válida + inválida → 422 na inválida
        with pytest.raises(ValidationError) as exc_info:
            ContactData(
                name="Test",
                tags=["cimi_invest:investidor", "leilao:perfildoido"],
            )
        assert "perfildoido" in str(exc_info.value)

    def test_interest_type_accepted(self):
        c = ContactData(name="Test", tags=["Instrutor", "Palestrante", "Patrocínio"])
        assert "Instrutor" in c.tags
        assert "Palestrante" in c.tags


class TestHelpers:
    """Funções auxiliares de parse e formatação."""

    def test_parse_classification_tags(self):
        tags = [
            "Patrocínio",
            "cimi_invest:investidor",
            "cimi_360:stand",
            "leilao:comprador",
        ]
        parsed = parse_classification_tags(tags)
        assert parsed == {
            "cimi_invest": "investidor",
            "cimi_360": "stand",
            "leilao": "comprador",
        }

    def test_parse_skips_invalid(self):
        tags = ["cimi_invest:parceria", "produto_desconhecido:x"]
        parsed = parse_classification_tags(tags)
        assert parsed == {"cimi_invest": "parceria"}  # legacy é aceito no parse

    def test_format_csv_columns(self):
        classifications = {
            "cimi_360": "stand",
            "cimi_invest": "investidor",
            "leilao": "comprador",
        }
        produtos, perfis = format_csv_columns(classifications)
        assert produtos == "CIMI 360; CIMI Invest; Leilão"
        assert perfis == "CIMI 360: Stand; CIMI Invest: Investidor; Leilão: Comprador"

    def test_format_csv_empty(self):
        produtos, perfis = format_csv_columns({})
        assert produtos == ""
        assert perfis == ""

    def test_format_csv_legacy(self):
        classifications = {"cimi_invest": "venda"}  # legacy
        produtos, perfis = format_csv_columns(classifications)
        assert produtos == "CIMI Invest"
        assert perfis == "CIMI Invest: Venda"

    def test_get_labels(self):
        assert get_product_label("cimi_360") == "CIMI 360"
        assert get_profile_label("cimi_invest", "t_e_i") == "T&I"
        assert get_profile_label("leilao", "municipio") == "Município"


class TestApiTaxonomyPayload:
    """Garante que o endpoint /api/taxonomy retorna exatamente o JSON."""

    def test_payload_matches_source(self):
        import json
        from pathlib import Path

        raw_path = Path(__file__).resolve().parent.parent.parent / "shared" / "taxonomy.json"
        with open(raw_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        payload = get_taxonomy_payload()
        assert payload["products"] == raw["products"]
        assert payload["legacy_profiles"] == raw.get("legacy_profiles", {})
        assert payload["interest_types"] == raw["interest_types"]
