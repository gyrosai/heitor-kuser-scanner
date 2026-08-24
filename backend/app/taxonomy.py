"""Fonte única da taxonomia CIMI Leads.

Carrega backend/app/taxonomy.json na importação e deriva todas as listas de
validação. Nenhum outro arquivo deve hardcodar produtos, perfis ou tags de
interesse.

IMPORTANTE: shared/taxonomy.json é a fonte EDITÁVEL. Este arquivo é uma cópia
sincronizada — editar só shared/taxonomy.json e rodar scripts/sync_taxonomy.py
(o pre-commit hook check-taxonomy-sync bloqueia commit se divergir).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_TAXONOMY_PATH = Path(__file__).resolve().parent / "taxonomy.json"


def _load_taxonomy() -> dict[str, Any]:
    try:
        with open(_TAXONOMY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Taxonomy file not found: %s", _TAXONOMY_PATH)
        raise RuntimeError("taxonomy.json is required") from None
    except json.JSONDecodeError as exc:
        logger.error("Invalid taxonomy JSON: %s", exc)
        raise RuntimeError("taxonomy.json is invalid") from exc


_raw = _load_taxonomy()

PRODUCTS: list[dict[str, Any]] = _raw["products"]
LEGACY_PROFILES: dict[str, list[dict[str, Any]]] = _raw.get("legacy_profiles", {})
INTEREST_TYPES: list[str] = _raw["interest_types"]

# ── Índices derivados para validação rápida ─────────────────────────────────

# product_key -> set de slugs válidos (inclui legacy)
_CLASSIFICATION_VALID: dict[str, set[str]] = {}
# product_key -> label
_PRODUCT_LABELS: dict[str, str] = {}
# product_key -> slug -> label
_PROFILE_LABELS: dict[str, dict[str, str]] = {}

for p in PRODUCTS:
    key = p["key"]
    slugs = {pr["slug"] for pr in p["profiles"]}
    _CLASSIFICATION_VALID[key] = slugs
    _PRODUCT_LABELS[key] = p["label"]
    _PROFILE_LABELS[key] = {pr["slug"]: pr["label"] for pr in p["profiles"]}

# Adiciona legacy nos validadores (mas não na UI)
for prod_key, profiles in LEGACY_PROFILES.items():
    legacy_slugs = {pr["slug"] for pr in profiles}
    _CLASSIFICATION_VALID.setdefault(prod_key, set()).update(legacy_slugs)
    # labels de legacy também são necessários para CSV/history
    if prod_key not in _PROFILE_LABELS:
        _PROFILE_LABELS[prod_key] = {}
    for pr in profiles:
        _PROFILE_LABELS[prod_key][pr["slug"]] = pr["label"]

# Conjunto de todas as tags de interesse aceitas
ALLOWED_TAGS_SET: set[str] = set(INTEREST_TYPES)


def is_valid_classification(tag: str) -> tuple[bool, str | None]:
    """Valida uma tag de classificação (produto:perfil).

    Retorna (True, None) se válida.
    Retorna (False, reason) se inválida, onde reason é uma mensagem para o usuário.
    """
    if ":" not in tag:
        return False, None  # não é classificação, é tag de interesse
    product_key, _, slug = tag.partition(":")
    if product_key not in _CLASSIFICATION_VALID:
        return False, f"produto '{product_key}' desconhecido na classificação '{tag}'"
    if slug not in _CLASSIFICATION_VALID[product_key]:
        return False, f"perfil '{slug}' inválido para '{product_key}'"
    return True, None


def get_product_label(key: str) -> str | None:
    return _PRODUCT_LABELS.get(key)


def get_profile_label(product_key: str, slug: str) -> str | None:
    return _PROFILE_LABELS.get(product_key, {}).get(slug)


def get_taxonomy_payload() -> dict[str, Any]:
    """Retorna o payload para GET /api/taxonomy (sem legacy na lista de produtos)."""
    return {
        "products": PRODUCTS,
        "legacy_profiles": LEGACY_PROFILES,
        "interest_types": INTEREST_TYPES,
    }


def parse_classification_tags(tags: list[str]) -> dict[str, str]:
    """Extrai classificações do array de tags: {product_key: slug}.

    Ignora tags que não seguem o formato produto:perfil.
    """
    result: dict[str, str] = {}
    for tag in tags:
        if ":" not in tag:
            continue
        product_key, _, slug = tag.partition(":")
        if product_key in _CLASSIFICATION_VALID and slug in _CLASSIFICATION_VALID[product_key]:
            result[product_key] = slug
    return result


# Ordem de exibição dos produtos (usada no CSV)
PRODUCTS_ORDER: list[str] = [p["key"] for p in PRODUCTS]


def format_csv_columns(classifications: dict[str, str]) -> tuple[str, str]:
    """Formata as colunas 'produtos' e 'perfis' para CSV export.

    Retorna (produtos_label_str, perfis_label_str).
    """
    produto_labels: list[str] = []
    perfil_labels: list[str] = []
    for product_key in PRODUCTS_ORDER:
        slug = classifications.get(product_key)
        if slug is None:
            continue
        label = _PRODUCT_LABELS.get(product_key, product_key)
        profile_label = _PROFILE_LABELS.get(product_key, {}).get(slug, slug)
        produto_labels.append(label)
        perfil_labels.append(f"{label}: {profile_label}")
    return "; ".join(produto_labels), "; ".join(perfil_labels)
