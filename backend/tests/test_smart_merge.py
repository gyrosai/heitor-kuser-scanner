"""Testes para o merge de classificação em _smart_merge (POST /contacts/{id}/merge).

Regra: tags de classificação ("<product>:<slug>") não fazem união — se o
payload novo traz um perfil pra um produto, o novo substitui QUALQUER perfil
existente do mesmo produto (um contato só tem um perfil por produto). Tags de
interesse (sem ":") continuam em união normal.

Rodar com:
    cd backend && uv run pytest tests/test_smart_merge.py -v
"""
from __future__ import annotations

from app.db_models import ScannedContact
from app.models import ContactData
from app.routers.scan import _smart_merge


def _existing(**overrides) -> ScannedContact:
    defaults = dict(
        name="Existente",
        phone=None,
        email=None,
        company=None,
        role=None,
        website=None,
        event_tag=None,
        tags=[],
        importance=None,
        notes=None,
    )
    defaults.update(overrides)
    return ScannedContact(**defaults)


def _new(**overrides) -> ContactData:
    defaults = dict(name="Novo")
    defaults.update(overrides)
    return ContactData(**defaults)


class TestClassificationMergeByProduct:
    def test_new_profile_replaces_existing_profile_same_product(self):
        existing = _existing(tags=["cimi_invest:parceria"])
        new = _new(tags=["cimi_invest:investidor"])
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["cimi_invest:investidor"]

    def test_product_without_new_tag_keeps_existing_profile(self):
        existing = _existing(tags=["leilao:comprador"])
        new = _new(tags=[])  # não manda nada de leilão
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["leilao:comprador"]

    def test_different_products_both_kept(self):
        existing = _existing(tags=["leilao:comprador"])
        new = _new(tags=["cimi_invest:investidor"])
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["cimi_invest:investidor", "leilao:comprador"]

    def test_interest_tags_still_union(self):
        existing = _existing(tags=["Patrocínio", "cimi_invest:parceria"])
        new = _new(tags=["Mídia", "cimi_invest:investidor"])
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["Mídia", "Patrocínio", "cimi_invest:investidor"]

    def test_multiple_products_replaced_independently(self):
        existing = _existing(tags=["cimi_invest:parceria", "leilao:vendedor"])
        new = _new(tags=["cimi_invest:investidor", "leilao:comprador"])
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["cimi_invest:investidor", "leilao:comprador"]

    def test_new_with_no_tags_keeps_all_existing(self):
        existing = _existing(tags=["leilao:comprador", "Patrocínio"])
        new = _new(tags=[])
        merged = _smart_merge(existing, new)
        assert merged["tags"] == ["Patrocínio", "leilao:comprador"]
