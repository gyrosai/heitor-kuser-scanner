import json
import logging
import re

from openai import AsyncOpenAI

from app.config import settings
from app.models import ContactData

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Você é um especialista em extrair dados de contato de cartões de visita.
Analise a imagem e extraia todos os dados de contato visíveis.
Retorne APENAS um JSON válido (sem markdown, sem explicação) com os campos:
{
  "name": "Nome Completo",
  "phone": "+5511999999999",
  "email": "email@empresa.com",
  "company": "Nome da Empresa",
  "role": "Cargo",
  "website": "www.empresa.com"
}
Regras:
- Para telefones, use formato internacional com + e DDI
- Se o cartão tem DDD mas não DDI, assuma Brasil (+55)
- Se não encontrar algum campo, use null
- NÃO invente dados que não estão visíveis no cartão
- Se houver múltiplos telefones, use o celular como principal"""


async def extract_contact_from_card(image_base64: str) -> ContactData:
    """Usa GPT-4o Vision para extrair dados de contato de foto de cartão."""
    if image_base64.startswith("data:"):
        image_base64 = image_base64.split(",", 1)[1]

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extraia os dados de contato deste cartão de visita.",
                        },
                    ],
                },
            ],
            max_tokens=500,
        )

        content = response.choices[0].message.content or ""
        logger.info("Resposta GPT-4o: %s", content[:200])

        data = _parse_json_response(content)

        name = data.get("name") or ""
        return ContactData(
            name=name or "Desconhecido",
            phone=data.get("phone"),
            email=data.get("email"),
            company=data.get("company"),
            role=data.get("role"),
            website=data.get("website"),
            source="card_photo",
            incomplete=not name,
        )

    except Exception as e:
        logger.error("Erro no OCR com GPT-4o: %s", e)
        raise


def _parse_json_response(content: str) -> dict:
    """Tenta parsear JSON da resposta do GPT, com fallback para regex."""
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    logger.warning("Não foi possível parsear JSON da resposta: %s", content[:200])
    return {}
