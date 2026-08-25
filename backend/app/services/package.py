"""Composição pura do pacote de materiais por e-mail.

``compose_package`` não faz I/O (sem DB, sem rede, sem chamadas externas):
recebe os dados já carregados (contato, template do produto, materiais
candidatos, assunto já resolvido) e devolve o corpo pronto para envio.
Reaproveitado hoje pelo pipeline de e-mail e, futuramente, por WhatsApp.

Placeholders suportados no corpo do template: {nome} {primeiro_nome} {evento}
{produto}. Um placeholder sem valor correspondente é removido de forma limpa
(sem deixar "undefined", chaves cruas ou espaço duplo).
"""

from __future__ import annotations

import html as html_lib
import re
from dataclasses import dataclass, field
from typing import Any, Protocol

# Máximo de links de materiais por e-mail; acima disso, corta na ordem
# recebida e reporta em warnings.
MAX_MATERIAL_LINKS = 10

# email_language do contato/pacote ("pt-BR"|"en"|"es") -> idioma dos
# materiais no catálogo ("PT"|"ENG"|"ESP"). Materiais com language=None
# entram em qualquer idioma.
LANGUAGE_TO_MATERIAL_LANG: dict[str, str] = {"pt-BR": "PT", "en": "ENG", "es": "ESP"}

# Regra de produto: a ausência de template ativo NUNCA impede o envio. Quando
# o produto ainda não tem um MessageTemplate cadastrado, ``compose_package``
# usa este texto genérico embutido por idioma (mesmos placeholders do
# template normal) e reporta em warnings — sem levantar exceção.
DEFAULT_TEMPLATE_BODY: dict[str, str] = {
    "pt-BR": (
        "Olá, {primeiro_nome}, foi um prazer estar com você no {evento}. "
        "Seguem os materiais:"
    ),
    "en": (
        "Hello {primeiro_nome}, it was a pleasure having you at {evento}. "
        "Here are the materials:"
    ),
    "es": (
        "Hola {primeiro_nome}, fue un placer contar con tu presencia en "
        "{evento}. Aquí tienes los materiales:"
    ),
}

_PLACEHOLDER_RE = re.compile(r"\{(nome|primeiro_nome|evento|produto)\}")
_MULTI_SPACE_RE = re.compile(r" {2,}")
_SPACE_BEFORE_PUNCT_RE = re.compile(r" +([.,!?;:])")


class MaterialLike(Protocol):
    """Formato mínimo esperado para cada material candidato (duck-typed).

    Compatível tanto com ``app.db_models.Material`` quanto com fixtures de
    teste (dataclass/namedtuple simples).
    """

    id: int
    label: str
    kind: str  # link | evento
    language: str | None  # PT | ENG | ESP | None
    url: str | None
    active: bool
    meta: dict[str, Any]


@dataclass
class PackageResult:
    subject: str
    text: str
    html: str
    warnings: list[str] = field(default_factory=list)
    material_ids_used: list[int] = field(default_factory=list)


def _render_placeholders(template: str, context: dict[str, str]) -> str:
    """Substitui os placeholders suportados; limpa o que sobrar de um valor vazio."""

    def _sub(match: re.Match[str]) -> str:
        return context.get(match.group(1), "") or ""

    rendered = _PLACEHOLDER_RE.sub(_sub, template)

    cleaned_lines: list[str] = []
    for raw_line in rendered.split("\n"):
        line = _MULTI_SPACE_RE.sub(" ", raw_line).strip()
        line = _SPACE_BEFORE_PUNCT_RE.sub(r"\1", line)
        # Evita múltiplas linhas em branco seguidas (placeholder era o
        # conteúdo inteiro de uma linha do template).
        if line == "" and cleaned_lines and cleaned_lines[-1] == "":
            continue
        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


def _select_materials(
    materials: list[MaterialLike],
    product_key: str,
    material_ids: list[int],
    material_lang: str | None,
) -> tuple[list[MaterialLike], list[str]]:
    """Filtra materiais selecionados: ativo + url + produto (se souber) + idioma.

    Preserva a ordem de ``material_ids``. Retorna (incluídos, warnings) —
    ids inválidos/inativos/sem url/idioma incompatível são reportados em
    warnings e excluídos, nunca silenciosamente incluídos.
    """
    warnings: list[str] = []
    by_id = {m.id: m for m in materials}
    included: list[MaterialLike] = []

    for mid in material_ids:
        m = by_id.get(mid)
        if m is None:
            warnings.append(f"material {mid} não encontrado — ignorado")
            continue
        m_product_key = getattr(m, "product_key", product_key)
        if m_product_key != product_key:
            warnings.append(
                f"material {mid} não pertence ao produto '{product_key}' — ignorado"
            )
            continue
        if not m.active:
            warnings.append(f"material {mid} ({m.label}) está inativo — ignorado")
            continue
        if not m.url:
            warnings.append(f"material {mid} ({m.label}) sem url — ignorado")
            continue
        if (
            m.language is not None
            and material_lang is not None
            and m.language != material_lang
        ):
            warnings.append(
                f"material {mid} ({m.label}) em idioma {m.language}, "
                f"pacote em {material_lang} — ignorado"
            )
            continue
        included.append(m)

    if len(included) > MAX_MATERIAL_LINKS:
        warnings.append(
            f"pacote tinha mais de {MAX_MATERIAL_LINKS} materiais — "
            f"cortado na ordem recebida"
        )
        included = included[:MAX_MATERIAL_LINKS]

    return included, warnings


def _material_label(m: MaterialLike) -> str:
    """Label de exibição; itens 'evento' ganham data/local quando houver."""
    if m.kind == "evento":
        meta = m.meta or {}
        date = meta.get("date")
        location = meta.get("location")
        extra = " — ".join(x for x in (date, location) if x)
        if extra:
            return f"{m.label} ({extra})"
    return m.label


def _build_text(body: str, materials: list[MaterialLike]) -> str:
    parts = [body] if body else []
    if materials:
        lines = [f"{_material_label(m)} — {m.url}" for m in materials]
        parts.append("\n".join(lines))
    return "\n\n".join(p for p in parts if p).strip()


def _build_html(body: str, materials: list[MaterialLike]) -> str:
    paragraphs = [p for p in body.split("\n\n") if p.strip()]
    parts = [
        f"<p>{html_lib.escape(p).replace(chr(10), '<br>')}</p>" for p in paragraphs
    ]
    if materials:
        items = []
        for m in materials:
            label = html_lib.escape(_material_label(m))
            url = html_lib.escape(m.url or "", quote=True)
            items.append(f'<li><a href="{url}">{label}</a></li>')
        parts.append("<ul>" + "".join(items) + "</ul>")
    return (
        '<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px">'
        + "".join(parts)
        + "</body></html>"
    )


def compose_package(
    contact: Any,
    product_key: str,
    product_label: str,
    language: str,
    material_ids: list[int],
    materials: list[MaterialLike],
    template_body: str | None,
    subject: str,
) -> PackageResult:
    """Monta {subject, text, html, warnings} do e-mail de pacote.

    Args:
        contact: objeto com atributos ``name``/``event_tag`` (ScannedContact
            ou qualquer duck-type equivalente).
        product_key: chave do produto selecionado (ex: "cimi_360").
        product_label: label de exibição do produto, usado no placeholder
            {produto} (ex: "CIMI 360").
        language: idioma do envio ("pt-BR"|"en"|"es").
        material_ids: ids de materiais marcados pelo operador, na ordem de
            exibição escolhida.
        materials: catálogo candidato (materiais do produto já carregados do
            DB pelo chamador — esta função não faz I/O).
        template_body: corpo do MessageTemplate do produto, com placeholders.
            ``None``/vazio = produto sem template ativo — usa o texto
            genérico embutido (``DEFAULT_TEMPLATE_BODY``) para o idioma do
            envio e reporta em warnings. Nunca levanta exceção.
        subject: assunto já resolvido pelo chamador (reaproveita
            SUBJECTS[idioma] do pipeline legado).
    """
    name = (getattr(contact, "name", None) or "").strip()
    primeiro_nome = name.split()[0] if name else ""
    evento = (getattr(contact, "event_tag", None) or "").strip()

    context = {
        "nome": name,
        "primeiro_nome": primeiro_nome,
        "evento": evento,
        "produto": product_label,
    }

    warnings: list[str] = []
    if template_body and template_body.strip():
        body_source = template_body
    else:
        body_source = DEFAULT_TEMPLATE_BODY.get(
            language, DEFAULT_TEMPLATE_BODY["pt-BR"]
        )
        warnings.append("template padrão usado")

    body = _render_placeholders(body_source, context)

    material_lang = LANGUAGE_TO_MATERIAL_LANG.get(language)
    included, material_warnings = _select_materials(
        materials, product_key, material_ids, material_lang
    )
    warnings.extend(material_warnings)

    return PackageResult(
        subject=subject,
        text=_build_text(body, included),
        html=_build_html(body, included),
        warnings=warnings,
        material_ids_used=[m.id for m in included],
    )
