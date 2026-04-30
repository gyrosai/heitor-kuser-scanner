import asyncio
import base64
import csv
import io
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import and_, func, select
from sqlalchemy.orm import defer

from app.database import async_session, get_db
from app.db_models import ScannedContact
from app.models import (
    ALLOWED_TAGS,
    BatchImageItem,
    BatchResultItem,
    BatchScanRequest,
    BatchScanResponse,
    ContactData,
    ScanRequest,
    ScanResponse,
)
from app.services import image_service, ocr_service, qrcode_service, vcard_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


def _contact_to_dict(c: ScannedContact, include_image_flag: bool = True) -> dict:
    """Serializa ScannedContact para dict de API. Nunca inclui card_image bytes."""
    data = {
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
        "importance": c.importance,
        "tags": list(c.tags or []),
        "is_draft": c.is_draft,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
    if include_image_flag:
        # has_image só está disponível se card_image foi carregado;
        # nas listagens, usamos defer + EXISTS via column, então passamos pelo callsite.
        try:
            data["has_image"] = c.card_image is not None
        except Exception:
            data["has_image"] = False
    return data


def _contact_to_pydantic(c: ScannedContact) -> ContactData:
    return ContactData(
        name=c.name or "",
        phone=c.phone,
        email=c.email,
        company=c.company,
        role=c.role,
        website=c.website,
        notes=c.notes,
        source=c.source if c.source in ("qrcode", "card_photo") else "card_photo",
        event_tag=c.event_tag,
        importance=c.importance,
        tags=list(c.tags or []),
    )


async def _save_contact(
    db,
    contact: ContactData,
    raw_qr_data: Optional[str] = None,
    card_image: Optional[bytes] = None,
) -> Optional[int]:
    """Salva contato no banco como draft. Nunca levanta exceção. Retorna id ou None."""
    if db is None:
        return None
    try:
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
            importance=contact.importance,
            tags=list(contact.tags or []),
            card_image=card_image,
            is_draft=True,
        )
        db.add(db_contact)
        await db.commit()
        await db.refresh(db_contact)
        logger.info(
            "Contato salvo no banco (draft): id=%s name=%s",
            db_contact.id,
            db_contact.name,
        )
        return db_contact.id
    except Exception as e:
        logger.error("Erro ao salvar contato no banco: %s", e)
        return None


@router.post("/scan/qrcode", response_model=ScanResponse)
async def scan_qrcode(request: ScanRequest, db=Depends(get_db)) -> ScanResponse:
    """Decodifica QR Code e retorna dados de contato."""
    try:
        image_bytes = base64.b64decode(request.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagem base64 inválida")

    contact = qrcode_service.decode_qrcode(image_bytes)
    raw_qr_data = None
    card_image: Optional[bytes] = None

    if contact is None:
        logger.info("QR Code não encontrado, tentando OCR como fallback")
        try:
            contact = await ocr_service.extract_contact_from_card(request.image)
        except Exception as e:
            return ScanResponse(
                success=False,
                error=f"Não foi possível decodificar a imagem: {e}",
            )
        # Só guarda imagem em fallback OCR (QR puro não precisa).
        card_image = image_service.compress_card_image(request.image)
    else:
        # NOTE: bug pré-existente — `image_bytes` aqui é o PNG, não a string
        # decodificada do QR. Gravava null bytes e Postgres rejeitava com
        # erro UTF-8. Mantendo None até refatorar qrcode_service pra retornar
        # também o raw_data (fora do escopo deste PR).
        raw_qr_data = None

    contact_id = await _save_contact(
        db, contact, raw_qr_data=raw_qr_data, card_image=card_image
    )
    return ScanResponse(success=True, contact=contact, contact_id=contact_id)


@router.post("/scan/card", response_model=ScanResponse)
async def scan_card(request: ScanRequest, db=Depends(get_db)) -> ScanResponse:
    """Extrai dados de contato de foto de cartão de visita via OCR."""
    try:
        contact = await ocr_service.extract_contact_from_card(request.image)
        card_image = image_service.compress_card_image(request.image)
        contact_id = await _save_contact(db, contact, card_image=card_image)
        return ScanResponse(success=True, contact=contact, contact_id=contact_id)
    except Exception as e:
        logger.error("Erro no scan de cartão: %s", e)
        return ScanResponse(
            success=False,
            error=f"Erro ao processar cartão: {e}",
        )


# TODO: Drafts órfãos (processados mas nunca salvos via /vcard) ficam
# no banco indefinidamente. PR futuro: cleanup job ou botão "Descartar
# drafts antigos" no QueueScreen.
@router.post("/scan/batch", response_model=BatchScanResponse)
async def scan_batch(request: BatchScanRequest) -> BatchScanResponse:
    """Processa lote de cartões em paralelo (OCR + persist como draft).

    Cada imagem roda em sessão de DB isolada — falhas individuais não
    derrubam o batch. Concorrência interna limitada por semáforo.
    """
    if async_session is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    semaphore = asyncio.Semaphore(5)

    async def process_one(item: BatchImageItem) -> BatchResultItem:
        async with semaphore:
            try:
                contact = await ocr_service.extract_contact_from_card(item.image_base64)
                card_image = image_service.compress_card_image(item.image_base64)
                # Sessão própria por task: AsyncSession não é task-safe, e
                # commit/rollback de uma task não pode afetar as demais.
                async with async_session() as task_db:
                    contact_id = await _save_contact(
                        task_db, contact, card_image=card_image
                    )
                if contact_id is None:
                    return BatchResultItem(
                        local_id=item.local_id,
                        success=False,
                        error="Falha ao persistir contato",
                    )
                return BatchResultItem(
                    local_id=item.local_id,
                    success=True,
                    contact_id=contact_id,
                    contact=contact,
                )
            except Exception as e:
                logger.error(
                    "Batch process erro local_id=%s: %s", item.local_id, e
                )
                return BatchResultItem(
                    local_id=item.local_id,
                    success=False,
                    error=str(e),
                )

    results = await asyncio.gather(*[process_one(item) for item in request.images])
    return BatchScanResponse(results=results)


@router.post("/vcard")
async def create_vcard(
    contact: ContactData,
    contact_id: Optional[int] = Query(None),
    force: bool = Query(False),
    db=Depends(get_db),
) -> Response:
    """Gera vCard E salva/atualiza no Google Contacts.

    - Sem contact_id: fluxo legado, INSERT novo contato com is_draft=False (compat backward).
    - Com contact_id: UPDATE do contato existente, com dedup check (409) a menos que force=True.
    """
    from app.services import google_contacts_service

    db_contact: Optional[ScannedContact] = None

    if db is not None and contact_id is not None:
        result = await db.execute(
            select(ScannedContact).where(ScannedContact.id == contact_id)
        )
        db_contact = result.scalar_one_or_none()
        if db_contact is None:
            raise HTTPException(status_code=404, detail="Contato não encontrado")

        # Dedup só roda quando contact_id está presente. Frontend antigo (sem
        # contact_id) não sabe lidar com 409, então o fluxo legado pula isso.
        if not force:
            conflict_filters = [
                ScannedContact.id != contact_id,
                ScannedContact.is_draft.is_(False),
                ScannedContact.event_tag == contact.event_tag,
            ]
            email_or_phone = []
            if contact.email:
                email_or_phone.append(
                    and_(
                        ScannedContact.email.isnot(None),
                        ScannedContact.email == contact.email,
                    )
                )
            if contact.phone:
                email_or_phone.append(
                    and_(
                        ScannedContact.phone.isnot(None),
                        ScannedContact.phone == contact.phone,
                    )
                )
            if email_or_phone:
                from sqlalchemy import or_

                dup_query = (
                    select(ScannedContact)
                    .where(and_(*conflict_filters, or_(*email_or_phone)))
                    .limit(1)
                )
                dup_result = await db.execute(dup_query)
                dup = dup_result.scalar_one_or_none()
                if dup is not None:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "existing": _contact_to_pydantic(dup).model_dump(),
                            "existing_id": dup.id,
                            "new": contact.model_dump(),
                        },
                    )

        db_contact.name = contact.name
        db_contact.phone = contact.phone
        db_contact.email = contact.email
        db_contact.company = contact.company
        db_contact.role = contact.role
        db_contact.website = contact.website
        db_contact.notes = contact.notes
        db_contact.event_tag = contact.event_tag
        db_contact.importance = contact.importance
        db_contact.tags = list(contact.tags or [])
        db_contact.is_draft = False
        await db.commit()
        await db.refresh(db_contact)

    elif db is not None:
        # Fluxo legado (frontend antigo, sem contact_id): tenta promover um
        # draft recente (últimos 5 min) com mesmo email/phone, pra evitar
        # duplicar o draft criado em /scan/card. Se não acha, INSERT novo
        # direto como não-draft. Quando o frontend novo (PR 2) chegar, ele
        # sempre manda contact_id e este branch não é mais usado.
        from datetime import timedelta
        from sqlalchemy import or_

        draft_window = datetime.now(timezone.utc) - timedelta(minutes=5)
        promote_filters = [
            ScannedContact.is_draft.is_(True),
            ScannedContact.scanned_at >= draft_window,
        ]
        email_or_phone = []
        if contact.email:
            email_or_phone.append(ScannedContact.email == contact.email)
        if contact.phone:
            email_or_phone.append(ScannedContact.phone == contact.phone)

        promoted = None
        if email_or_phone:
            promote_query = (
                select(ScannedContact)
                .where(and_(*promote_filters, or_(*email_or_phone)))
                .order_by(ScannedContact.scanned_at.desc())
                .limit(1)
            )
            promote_result = await db.execute(promote_query)
            promoted = promote_result.scalar_one_or_none()

        if promoted is not None:
            promoted.name = contact.name
            promoted.phone = contact.phone
            promoted.email = contact.email
            promoted.company = contact.company
            promoted.role = contact.role
            promoted.website = contact.website
            promoted.notes = contact.notes
            promoted.event_tag = contact.event_tag
            promoted.importance = contact.importance
            promoted.tags = list(contact.tags or [])
            promoted.is_draft = False
            await db.commit()
            await db.refresh(promoted)
            db_contact = promoted
            logger.info(
                "Draft promovido (legacy flow): id=%s name=%s",
                db_contact.id,
                db_contact.name,
            )
        else:
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
                importance=contact.importance,
                tags=list(contact.tags or []),
                is_draft=False,
            )
            db.add(db_contact)
            await db.commit()
            await db.refresh(db_contact)

    # Salvar/atualizar no Google Contacts (best effort).
    try:
        if db_contact is not None and db_contact.google_contact_id:
            ok = await google_contacts_service.update_google_contact(
                contact, db_contact.google_contact_id, db
            )
            if ok:
                logger.info("Contato atualizado no Google Contacts: %s", contact.name)
        else:
            google_resource = await google_contacts_service.save_to_google_contacts(
                contact, db
            )
            if google_resource and db_contact is not None and db is not None:
                db_contact.google_contact_id = google_resource
                await db.commit()
                logger.info("Contato salvo no Google Contacts: %s", contact.name)
    except Exception as e:
        logger.error("Erro ao salvar/atualizar no Google Contacts: %s", e)

    vcard_str = vcard_service.generate_vcard(contact)
    filename = (contact.name or "contato").replace(" ", "_")

    return Response(
        content=vcard_str,
        media_type="text/x-vcard",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.vcf"',
        },
    )


@router.post("/contacts/import-batch")
async def import_batch(
    contacts: list[ContactData],
    db=Depends(get_db),
):
    """Importa lista de contatos para o Google Contacts em lote."""
    from app.services import google_contacts_service

    results = []
    for i, contact in enumerate(contacts):
        try:
            db_contact = ScannedContact(
                name=contact.name,
                phone=contact.phone,
                email=contact.email,
                company=contact.company,
                role=contact.role,
                website=contact.website,
                source="import",
                event_tag=contact.event_tag,
                importance=contact.importance,
                tags=list(contact.tags or []),
                is_draft=False,
            )
            db.add(db_contact)
            await db.commit()

            resource = await google_contacts_service.save_to_google_contacts(contact, db)
            results.append({
                "index": i + 1,
                "name": contact.name,
                "status": "ok" if resource else "db_only",
                "google_id": resource,
            })
            logger.info("Importado %d/%d: %s", i + 1, len(contacts), contact.name)

        except Exception as e:
            logger.error("Erro ao importar %s: %s", contact.name, e)
            results.append({
                "index": i + 1,
                "name": contact.name,
                "status": "error",
                "error": str(e),
            })

    ok = len([r for r in results if r["status"] == "ok"])
    return {
        "total": len(contacts),
        "success": ok,
        "failed": len(contacts) - ok,
        "results": results,
    }


# Endpoints com path fixo precisam vir ANTES de /contacts/{contact_id}
# porque FastAPI casa por ordem de declaração.


@router.get("/contacts/tags")
async def list_tags(db=Depends(get_db)):
    """Tags distintas usadas em contatos não-draft, com contagem."""
    if db is None:
        return []

    tag_unnest = func.unnest(ScannedContact.tags).label("tag")
    query = (
        select(tag_unnest, func.count().label("count"))
        .where(ScannedContact.is_draft.is_(False))
        .group_by(tag_unnest)
        .order_by(func.count().desc())
    )
    result = await db.execute(query)
    return [{"tag": row.tag, "count": row.count} for row in result.all()]


@router.get("/contacts/events")
async def list_events(db=Depends(get_db)):
    """Event tags distintas com contagem e timestamp do scan mais recente."""
    if db is None:
        return []

    last_scan = func.max(ScannedContact.scanned_at).label("last_scan")
    query = (
        select(
            ScannedContact.event_tag,
            func.count().label("count"),
            last_scan,
        )
        .where(
            ScannedContact.is_draft.is_(False),
            ScannedContact.event_tag.isnot(None),
        )
        .group_by(ScannedContact.event_tag)
        .order_by(last_scan.desc())
    )
    result = await db.execute(query)
    return [
        {
            "event_tag": row.event_tag,
            "count": row.count,
            "last_scan": row.last_scan.isoformat() if row.last_scan else None,
        }
        for row in result.all()
    ]


def _slugify(value: str) -> str:
    if not value:
        return "todos"
    s = re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-").lower()
    return s or "todos"


@router.get("/contacts/export.csv")
async def export_contacts_csv(
    event_tag: Optional[str] = None,
    min_importance: Optional[int] = None,
    tags: Optional[list[str]] = Query(None),
    db=Depends(get_db),
):
    """Exporta contatos não-draft em CSV (UTF-8 com BOM, separador vírgula)."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    filters = [ScannedContact.is_draft.is_(False)]
    if event_tag:
        filters.append(ScannedContact.event_tag == event_tag)
    if min_importance is not None:
        filters.append(ScannedContact.importance >= min_importance)
    if tags:
        filters.append(ScannedContact.tags.op("&&")(list(tags)))

    has_image_col = (ScannedContact.card_image.isnot(None)).label("has_image")
    query = (
        select(ScannedContact, has_image_col)
        .where(and_(*filters))
        .order_by(ScannedContact.scanned_at.desc())
        .options(defer(ScannedContact.card_image))
    )
    result = await db.execute(query)
    rows = result.all()

    buf = io.StringIO()
    buf.write("﻿")
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Nome",
            "Empresa",
            "Cargo",
            "Telefone",
            "Email",
            "Website",
            "Importância",
            "Tags",
            "Observações",
            "Evento",
            "Data",
            "Tem Foto",
        ]
    )
    for row in rows:
        c = row[0]
        has_image = bool(row[1])
        importance_str = "⭐" * c.importance if c.importance else ""
        writer.writerow(
            [
                c.name or "",
                c.company or "",
                c.role or "",
                c.phone or "",
                c.email or "",
                c.website or "",
                importance_str,
                "; ".join(c.tags or []),
                c.notes or "",
                c.event_tag or "",
                c.scanned_at.isoformat() if c.scanned_at else "",
                "Sim" if has_image else "Não",
            ]
        )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slug = _slugify(event_tag or "todos")
    filename = f"contatos_{slug}_{today}.csv"

    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/contacts")
async def list_contacts(
    event_tag: Optional[str] = None,
    min_importance: Optional[int] = None,
    tags: Optional[list[str]] = Query(None),
    search: Optional[str] = None,
    include_drafts: bool = False,
    db=Depends(get_db),
):
    """Lista contatos salvos no banco (não-draft por padrão)."""
    if db is None:
        return {"error": "Banco de dados não configurado", "contacts": []}

    filters = []
    if not include_drafts:
        filters.append(ScannedContact.is_draft.is_(False))
    if event_tag:
        filters.append(ScannedContact.event_tag == event_tag)
    if min_importance is not None:
        filters.append(ScannedContact.importance >= min_importance)
    if tags:
        filters.append(ScannedContact.tags.op("&&")(list(tags)))
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_

        filters.append(
            or_(
                ScannedContact.name.ilike(like),
                ScannedContact.company.ilike(like),
            )
        )

    has_image_col = (ScannedContact.card_image.isnot(None)).label("has_image")
    query = (
        select(ScannedContact, has_image_col)
        .order_by(ScannedContact.scanned_at.desc())
        .options(defer(ScannedContact.card_image))
    )
    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    out = []
    for row in result.all():
        c = row[0]
        has_image = bool(row[1])
        out.append(
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
                "importance": c.importance,
                "tags": list(c.tags or []),
                "is_draft": c.is_draft,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "has_image": has_image,
            }
        )
    return out


@router.patch("/contacts/{contact_id}")
async def patch_contact(
    contact_id: int,
    payload: dict,
    db=Depends(get_db),
):
    """Atualiza parcialmente um contato. Sincroniza no Google se aplicável."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    if not payload:
        raise HTTPException(status_code=400, detail="Body vazio")

    result = await db.execute(
        select(ScannedContact).where(ScannedContact.id == contact_id)
    )
    db_contact = result.scalar_one_or_none()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    # Whitelist explícita; campos desconhecidos são ignorados silenciosamente.
    allowed_fields = {
        "name",
        "phone",
        "email",
        "company",
        "role",
        "website",
        "notes",
        "event_tag",
        "importance",
        "tags",
    }
    sanitized = {}
    for field, value in payload.items():
        if field not in allowed_fields:
            continue
        # Reusa os validators de ContactData (única fonte de verdade).
        if field == "importance":
            value = ContactData.validate_importance(value)
        elif field == "tags":
            value = ContactData.validate_tags(value)
        sanitized[field] = value

    if not sanitized:
        raise HTTPException(status_code=400, detail="Nenhum campo válido enviado")

    for field, value in sanitized.items():
        setattr(db_contact, field, value)

    await db.commit()
    await db.refresh(db_contact)

    if db_contact.google_contact_id:
        from app.services import google_contacts_service

        try:
            await google_contacts_service.update_google_contact(
                _contact_to_pydantic(db_contact),
                db_contact.google_contact_id,
                db,
            )
        except Exception as e:
            logger.error("Erro ao sincronizar PATCH com Google: %s", e)

    return _contact_to_dict(db_contact)


@router.delete("/contacts/{contact_id}", status_code=204)
async def delete_contact(contact_id: int, db=Depends(get_db)):
    """Deleta um contato. Best-effort no Google Contacts."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    result = await db.execute(
        select(ScannedContact).where(ScannedContact.id == contact_id)
    )
    db_contact = result.scalar_one_or_none()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    if db_contact.google_contact_id:
        from app.services import google_contacts_service

        try:
            await google_contacts_service.delete_google_contact(
                db_contact.google_contact_id, db
            )
        except Exception as e:
            logger.error("Erro ao deletar no Google: %s", e)

    await db.delete(db_contact)
    await db.commit()
    return Response(status_code=204)


def _smart_merge(existing: ScannedContact, new: ContactData) -> dict:
    """Merge inteligente: vazio → pega novo; tags → união; importance → max;
    notes → append timestamped; card_image → mantém existing."""
    def empty(v):
        return v is None or (isinstance(v, str) and v.strip() == "")

    merged = {}
    for field in ("name", "phone", "email", "company", "role", "website", "event_tag"):
        existing_v = getattr(existing, field)
        new_v = getattr(new, field)
        merged[field] = new_v if empty(existing_v) and not empty(new_v) else existing_v

    existing_tags = set(existing.tags or [])
    new_tags = set(new.tags or [])
    merged["tags"] = sorted(existing_tags | new_tags)

    existing_imp = existing.importance or 0
    new_imp = new.importance or 0
    max_imp = max(existing_imp, new_imp)
    merged["importance"] = max_imp if max_imp > 0 else None

    if new.notes and new.notes.strip():
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        if existing.notes and existing.notes.strip():
            merged["notes"] = f"{existing.notes}\n---\n[{ts}] {new.notes}"
        else:
            merged["notes"] = f"[{ts}] {new.notes}"
    else:
        merged["notes"] = existing.notes

    return merged


@router.post("/contacts/{contact_id}/merge")
async def merge_contact(
    contact_id: int,
    new_contact: ContactData,
    db=Depends(get_db),
):
    """Merge inteligente do contato existente com novo payload."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    result = await db.execute(
        select(ScannedContact).where(ScannedContact.id == contact_id)
    )
    db_contact = result.scalar_one_or_none()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    merged = _smart_merge(db_contact, new_contact)
    for field, value in merged.items():
        setattr(db_contact, field, value)
    db_contact.is_draft = False

    await db.commit()
    await db.refresh(db_contact)

    if db_contact.google_contact_id:
        from app.services import google_contacts_service

        try:
            await google_contacts_service.update_google_contact(
                _contact_to_pydantic(db_contact),
                db_contact.google_contact_id,
                db,
            )
        except Exception as e:
            logger.error("Erro ao sincronizar merge com Google: %s", e)

    return _contact_to_dict(db_contact)


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: int, db=Depends(get_db)):
    """Retorna ContactRecord completo (sem bytes da imagem)."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    has_image_col = (ScannedContact.card_image.isnot(None)).label("has_image")
    query = (
        select(ScannedContact, has_image_col)
        .where(ScannedContact.id == contact_id)
        .options(defer(ScannedContact.card_image))
    )
    result = await db.execute(query)
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    c = row[0]
    return {
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
        "importance": c.importance,
        "tags": list(c.tags or []),
        "is_draft": c.is_draft,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "has_image": bool(row[1]),
        "google_contact_id": c.google_contact_id,
    }


@router.post("/contacts/{contact_id}/sync-google")
async def sync_contact_google(contact_id: int, db=Depends(get_db)):
    """Sincroniza um contato com o Google Contacts (idempotente).

    - Se ainda não tem google_contact_id: cria.
    - Se já tem: atualiza.
    - Sempre retorna {google_contact_id, synced}.
    - 503 se Google não conectado.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    result = await db.execute(
        select(ScannedContact).where(ScannedContact.id == contact_id)
    )
    db_contact = result.scalar_one_or_none()
    if db_contact is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    from app.services import google_contacts_service

    pydantic_contact = _contact_to_pydantic(db_contact)

    if db_contact.google_contact_id:
        ok = await google_contacts_service.update_google_contact(
            pydantic_contact, db_contact.google_contact_id, db
        )
        if not ok:
            raise HTTPException(
                status_code=503,
                detail="Falha ao atualizar no Google Contacts (verifique conexão)",
            )
        return {"google_contact_id": db_contact.google_contact_id, "synced": True}

    resource_name = await google_contacts_service.save_to_google_contacts(
        pydantic_contact, db
    )
    if not resource_name:
        raise HTTPException(
            status_code=503,
            detail="Google Contacts não conectado ou falha ao salvar",
        )

    db_contact.google_contact_id = resource_name
    await db.commit()
    return {"google_contact_id": resource_name, "synced": True}


@router.get("/contacts/{contact_id}/image")
async def get_contact_image(contact_id: int, db=Depends(get_db)):
    """Retorna a foto do cartão como JPEG. 404 se não tiver."""
    if db is None:
        raise HTTPException(status_code=503, detail="Banco de dados não configurado")

    result = await db.execute(
        select(ScannedContact.card_image).where(ScannedContact.id == contact_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    image_bytes = row[0]
    if not image_bytes:
        raise HTTPException(status_code=404, detail="Sem imagem")

    return Response(
        content=bytes(image_bytes),
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}
