"""Catálogo de produtos para a biblioteca de materiais.

Único lugar que mapeia o nome de produto do CSV (como o Henrique preenche) para
o ``product_key`` canônico usado nas tabelas ``materials``/``message_templates``.

Os labels de exibição dos quatro produtos da taxonomia vêm de
``shared/taxonomy.json`` (via ``app.taxonomy``); ``reuniao`` é um produto só de
envio (não aparece na classificação) e tem label fixo aqui.
"""
from __future__ import annotations

from app.taxonomy import get_product_label

# CSV → product_key. Chaves comparadas de forma case-insensitive e sem espaços
# nas bordas (ver normalize_product_key).
_CSV_NAME_TO_KEY: dict[str, str] = {
    "cimi360": "cimi_360",
    "cimi invest": "cimi_invest",
    "leilão": "leilao",
    "leilao": "leilao",  # tolera falta de acento
    "indip": "indip",
    "feirão dos corretores": "feirao",
    "feirao dos corretores": "feirao",  # tolera falta de acento
    "reunião aleatória": "reuniao",
    "reuniao aleatoria": "reuniao",     # tolera falta de acento
}

# product_key → label de exibição para produtos que NÃO estão na taxonomia.
_EXTRA_PRODUCT_LABELS: dict[str, str] = {
    "reuniao": "Reunião",
}

# Ordem de exibição em GET /api/materials.
PRODUCTS_ORDER: list[str] = [
    "cimi_360",
    "cimi_invest",
    "leilao",
    "indip",
    "feirao",
    "reuniao",
]

VALID_PRODUCT_KEYS: set[str] = set(PRODUCTS_ORDER)


def normalize_product_key(csv_product_name: str) -> str | None:
    """Converte o nome de produto do CSV em product_key. None se desconhecido."""
    if not csv_product_name:
        return None
    key = _CSV_NAME_TO_KEY.get(csv_product_name.strip().lower())
    return key


def product_label(product_key: str) -> str:
    """Label de exibição de um product_key (taxonomia + extras)."""
    label = get_product_label(product_key)
    if label:
        return label
    return _EXTRA_PRODUCT_LABELS.get(product_key, product_key)
