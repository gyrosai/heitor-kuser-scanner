import base64
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.models import ContactData, ScanRequest, ScanResponse
from app.services import ocr_service, qrcode_service, vcard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.post("/scan/qrcode", response_model=ScanResponse)
async def scan_qrcode(request: ScanRequest) -> ScanResponse:
    """Decodifica QR Code e retorna dados de contato."""
    try:
        image_bytes = base64.b64decode(request.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagem base64 inválida")

    contact = qrcode_service.decode_qrcode(image_bytes)

    if contact is None:
        logger.info("QR Code não encontrado, tentando OCR como fallback")
        try:
            contact = await ocr_service.extract_contact_from_card(request.image)
        except Exception as e:
            return ScanResponse(
                success=False,
                error=f"Não foi possível decodificar a imagem: {e}",
            )

    return ScanResponse(success=True, contact=contact)


@router.post("/scan/card", response_model=ScanResponse)
async def scan_card(request: ScanRequest) -> ScanResponse:
    """Extrai dados de contato de foto de cartão de visita via OCR."""
    try:
        contact = await ocr_service.extract_contact_from_card(request.image)
        return ScanResponse(success=True, contact=contact)
    except Exception as e:
        logger.error("Erro no scan de cartão: %s", e)
        return ScanResponse(
            success=False,
            error=f"Erro ao processar cartão: {e}",
        )


@router.post("/vcard")
async def create_vcard(contact: ContactData) -> Response:
    """Gera arquivo vCard (.vcf) para download."""
    vcard_str = vcard_service.generate_vcard(contact)
    filename = contact.name.replace(" ", "_")

    return Response(
        content=vcard_str,
        media_type="text/x-vcard",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.vcf"',
        },
    )


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}
