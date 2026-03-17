import base64
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.database import get_db
from app.models import ContactData, ScanRequest, ScanResponse
from app.services import ocr_service, qrcode_service, vcard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


async def _save_contact(
    db,
    contact: ContactData,
    raw_qr_data: Optional[str] = None,
):
    """Salva contato no banco. Nunca levanta exceção — apenas loga erros."""
    if db is None:
        return
    try:
        from app.db_models import ScannedContact

        db_contact = ScannedContact(
            name=contact.name,
            phone=contact.phone,
            email=contact.email,
            company=contact.company,
            role=contact.role,
            website=contact.website,
            notes=contact.notes,
            source=contact.source,
            event_tag=contact.event_tag,
            raw_qr_data=raw_qr_data,
        )
        db.add(db_contact)
        await db.commit()
        await db.refresh(db_contact)
        logger.info("Contato salvo no banco: id=%s name=%s", db_contact.id, db_contact.name)
    except Exception as e:
        logger.error("Erro ao salvar contato no banco: %s", e)


@router.post("/scan/qrcode", response_model=ScanResponse)
async def scan_qrcode(request: ScanRequest, db=Depends(get_db)) -> ScanResponse:
    """Decodifica QR Code e retorna dados de contato."""
    try:
        image_bytes = base64.b64decode(request.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagem base64 inválida")

    contact = qrcode_service.decode_qrcode(image_bytes)
    raw_qr_data = None

    if contact is None:
        logger.info("QR Code não encontrado, tentando OCR como fallback")
        try:
            contact = await ocr_service.extract_contact_from_card(request.image)
        except Exception as e:
            return ScanResponse(
                success=False,
                error=f"Não foi possível decodificar a imagem: {e}",
            )
    else:
        raw_qr_data = image_bytes.decode("utf-8", errors="ignore")

    await _save_contact(db, contact, raw_qr_data=raw_qr_data)
    return ScanResponse(success=True, contact=contact)


@router.post("/scan/card", response_model=ScanResponse)
async def scan_card(request: ScanRequest, db=Depends(get_db)) -> ScanResponse:
    """Extrai dados de contato de foto de cartão de visita via OCR."""
    try:
        contact = await ocr_service.extract_contact_from_card(request.image)
        await _save_contact(db, contact)
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


@router.get("/contacts")
async def list_contacts(
    event_tag: Optional[str] = None,
    db=Depends(get_db),
):
    """Lista todos os contatos salvos no banco."""
    if db is None:
        return {"error": "Banco de dados não configurado", "contacts": []}

    from sqlalchemy import select

    from app.db_models import ScannedContact

    query = select(ScannedContact).order_by(ScannedContact.scanned_at.desc())
    if event_tag:
        query = query.where(ScannedContact.event_tag == event_tag)

    result = await db.execute(query)
    contacts = result.scalars().all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "company": c.company,
            "role": c.role,
            "website": c.website,
            "notes": c.notes,
            "source": c.source,
            "event_tag": c.event_tag,
            "scanned_at": c.scanned_at.isoformat() if c.scanned_at else None,
        }
        for c in contacts
    ]


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}
