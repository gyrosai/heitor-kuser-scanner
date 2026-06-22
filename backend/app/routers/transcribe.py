from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.transcription_service import (
    extract_bullets,
    format_notes_from_audio,
    transcribe_audio,
)

router = APIRouter(prefix="/api")

_MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be audio")

    audio_bytes = await audio.read()
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio too large (max 25MB)")

    try:
        transcricao = await transcribe_audio(audio_bytes, audio.filename or "audio.webm")
        bullets = await extract_bullets(transcricao)
        notes_formatted = format_notes_from_audio(transcricao, bullets)
        return {
            "transcricao": transcricao,
            "bullets": bullets,
            "notes": notes_formatted,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
