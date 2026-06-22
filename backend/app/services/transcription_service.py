import io
import json

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcreve áudio em pt-BR usando Whisper."""
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    result = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="pt",
    )
    return result.text


async def extract_bullets(transcricao: str) -> list[str]:
    """Extrai 3-7 bullet points da transcrição via GPT-4o-mini."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Extraia 3-7 bullet points objetivos desta transcrição "
                    "de observação sobre um contato de evento. Retorne APENAS "
                    'um JSON com formato {"bullets": ["...", "..."]}.'
                ),
            },
            {"role": "user", "content": transcricao},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    data = json.loads(response.choices[0].message.content)
    return data.get("bullets", [])


def format_notes_from_audio(transcricao: str, bullets: list[str]) -> str:
    """Combina transcrição + bullets no formato de notes."""
    bullets_md = "\n".join(f"• {b}" for b in bullets)
    return (
        f"[Transcrição do áudio]\n{transcricao}\n\n"
        f"[Pontos-chave]\n{bullets_md}"
    )
