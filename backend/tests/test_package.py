"""Testes de app.services.package.compose_package (composição pura, sem I/O).

Rodar com:
    cd backend && DYLD_LIBRARY_PATH=/opt/homebrew/lib \
      .venv/bin/python -m pytest tests/test_package.py -v
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from app.services.package import MAX_MATERIAL_LINKS, compose_package


@dataclass
class FakeMaterial:
    id: int
    label: str
    url: str | None = "https://example.com"
    kind: str = "link"
    language: str | None = None
    active: bool = True
    meta: dict[str, Any] = field(default_factory=dict)
    product_key: str = "cimi_360"


@dataclass
class FakeContact:
    name: str | None = "João Silva"
    event_tag: str | None = "CIMI2026"


def _materials(*items: FakeMaterial) -> list[FakeMaterial]:
    return list(items)


# ═══════════════════════════════════════════════════════════════════════════
# Placeholders
# ═══════════════════════════════════════════════════════════════════════════


def test_placeholders_all_resolved():
    result = compose_package(
        contact=FakeContact(name="Maria Souza", event_tag="CIMI360"),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Olá {primeiro_nome}, foi um prazer no {evento} falar sobre {produto}.",
        subject="Assunto fixo",
    )
    assert result.text == "Olá Maria, foi um prazer no CIMI360 falar sobre CIMI 360."
    assert "{" not in result.text
    assert "undefined" not in result.text.lower()


def test_missing_placeholder_removed_cleanly_no_double_space():
    result = compose_package(
        contact=FakeContact(name="Ana", event_tag=None),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Olá {primeiro_nome}, foi um prazer no {evento}.",
        subject="Assunto",
    )
    assert "{evento}" not in result.text
    assert "undefined" not in result.text.lower()
    assert "  " not in result.text  # sem espaço duplo
    assert " ." not in result.text  # sem espaço solto antes de pontuação


def test_missing_name_produces_empty_not_undefined():
    result = compose_package(
        contact=FakeContact(name=None, event_tag="CIMI2026"),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Olá {primeiro_nome}, tudo bem?",
        subject="Assunto",
    )
    # Espaço solto antes da vírgula também é limpo (não só o placeholder cru).
    assert result.text == "Olá, tudo bem?"
    assert "undefined" not in result.text.lower()


def test_produto_placeholder_uses_product_label():
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_invest",
        product_label="CIMI Invest",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Sobre {produto}:",
        subject="Assunto",
    )
    assert "CIMI Invest" in result.text


# ═══════════════════════════════════════════════════════════════════════════
# Filtro de materiais: idioma, ativo, url, produto
# ═══════════════════════════════════════════════════════════════════════════


def test_filters_by_language_pt():
    materials = _materials(
        FakeMaterial(id=1, label="Kit PT", language="PT", url="https://x/pt"),
        FakeMaterial(id=2, label="Kit ENG", language="ENG", url="https://x/en"),
        FakeMaterial(id=3, label="Kit universal", language=None, url="https://x/u"),
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1, 2, 3],
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == [1, 3]
    assert any("idioma" in w for w in result.warnings)


def test_filters_by_language_en_maps_to_eng():
    materials = _materials(
        FakeMaterial(id=1, label="Kit PT", language="PT", url="https://x/pt"),
        FakeMaterial(id=2, label="Kit ENG", language="ENG", url="https://x/en"),
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="en",
        material_ids=[1, 2],
        materials=materials,
        template_body="Body.",
        subject="Subject",
    )
    assert result.material_ids_used == [2]


def test_filters_by_language_es_maps_to_esp():
    materials = _materials(
        FakeMaterial(id=1, label="Kit ESP", language="ESP", url="https://x/es"),
        FakeMaterial(id=2, label="Kit ENG", language="ENG", url="https://x/en"),
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="es",
        material_ids=[1, 2],
        materials=materials,
        template_body="Cuerpo.",
        subject="Asunto",
    )
    assert result.material_ids_used == [1]


def test_inactive_material_ignored_and_warned():
    materials = _materials(FakeMaterial(id=1, label="Inativo", active=False))
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1],
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == []
    assert any("inativo" in w for w in result.warnings)


def test_material_without_url_ignored_and_warned():
    materials = _materials(FakeMaterial(id=1, label="Sem url", url=None))
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1],
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == []
    assert any("sem url" in w for w in result.warnings)


def test_unknown_material_id_ignored_and_warned():
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[999],
        materials=[],
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == []
    assert any("não encontrado" in w for w in result.warnings)


def test_material_from_other_product_ignored():
    materials = _materials(
        FakeMaterial(id=1, label="De outro produto", product_key="cimi_invest")
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1],
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == []
    assert any("não pertence ao produto" in w for w in result.warnings)


# ═══════════════════════════════════════════════════════════════════════════
# Limite de 10 links
# ═══════════════════════════════════════════════════════════════════════════


def test_more_than_ten_materials_is_cut_with_warning():
    materials = _materials(
        *[FakeMaterial(id=i, label=f"Item {i}") for i in range(1, 15)]
    )
    ids = list(range(1, 15))
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=ids,
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert len(result.material_ids_used) == MAX_MATERIAL_LINKS
    assert result.material_ids_used == list(range(1, MAX_MATERIAL_LINKS + 1))
    assert any("mais de 10" in w for w in result.warnings)


# ═══════════════════════════════════════════════════════════════════════════
# Formato: uma linha por item, evento com data/local, texto + html
# ═══════════════════════════════════════════════════════════════════════════


def test_one_line_per_material_label_and_url():
    materials = _materials(
        FakeMaterial(id=1, label="Mídia Kit", url="https://x/kit"),
        FakeMaterial(id=2, label="Vídeo institucional", url="https://x/video"),
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1, 2],
        materials=materials,
        template_body="Segue material.",
        subject="Assunto",
    )
    assert "Mídia Kit — https://x/kit" in result.text
    assert "Vídeo institucional — https://x/video" in result.text


def test_evento_material_includes_date_and_location():
    materials = _materials(
        FakeMaterial(
            id=1,
            label="Missão Dubai",
            kind="evento",
            url="https://x/dubai",
            meta={"date": "2026-10-01", "location": "Dubai"},
        )
    )
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1],
        materials=materials,
        template_body="Segue.",
        subject="Assunto",
    )
    assert "Missão Dubai (2026-10-01 — Dubai)" in result.text
    assert "Missão Dubai (2026-10-01 — Dubai)" in result.html


def test_html_has_paragraphs_and_links_no_raw_placeholder():
    materials = _materials(FakeMaterial(id=1, label="Kit", url="https://x/kit"))
    result = compose_package(
        contact=FakeContact(name="Bia"),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[1],
        materials=materials,
        template_body="Olá {primeiro_nome}.\n\nSegue o kit.",
        subject="Assunto",
    )
    assert "<p>Olá Bia.</p>" in result.html
    assert "<p>Segue o kit.</p>" in result.html
    assert '<a href="https://x/kit">Kit</a>' in result.html
    assert "{" not in result.html


def test_zero_materials_still_renders_body():
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Só o corpo, sem materiais.",
        subject="Assunto",
    )
    assert result.text == "Só o corpo, sem materiais."
    assert result.material_ids_used == []
    assert result.warnings == []


def test_subject_passthrough():
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language="pt-BR",
        material_ids=[],
        materials=[],
        template_body="Corpo.",
        subject="Foi um prazer te conhecer no CIMI2026 — CIMI",
    )
    assert result.subject == "Foi um prazer te conhecer no CIMI2026 — CIMI"


@pytest.mark.parametrize("language", ["pt-BR", "en", "es"])
def test_universal_language_material_always_included(language):
    materials = _materials(FakeMaterial(id=1, label="Universal", language=None))
    result = compose_package(
        contact=FakeContact(),
        product_key="cimi_360",
        product_label="CIMI 360",
        language=language,
        material_ids=[1],
        materials=materials,
        template_body="Corpo.",
        subject="Assunto",
    )
    assert result.material_ids_used == [1]
