from app.services.email_content import (
    AFTERMOVIE_URLS,
    BODIES,
    DEFAULT_LANGUAGE,
    SUBJECTS,
)


def render_subject(evento: str, idioma: str) -> str:
    template = SUBJECTS.get(idioma, SUBJECTS[DEFAULT_LANGUAGE])
    return template.format(evento=evento)


def render_plain_body(
    primeiro_nome: str,
    evento: str,
    classificacoes: list[dict],
    idioma: str,
) -> str:
    """Retorna texto plano do e-mail (sem HTML).
    Gmail aplica formatação padrão e anexa assinatura do Heitor.

    `classificacoes` reservado para futuras variações por perfil do lead.
    """
    body_template = BODIES.get(idioma, BODIES[DEFAULT_LANGUAGE])
    aftermovie = AFTERMOVIE_URLS.get(idioma, AFTERMOVIE_URLS[DEFAULT_LANGUAGE])

    return body_template.format(
        primeiro_nome=primeiro_nome,
        evento=evento,
        aftermovie_url=aftermovie,
    )
