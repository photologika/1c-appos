import secrets
import io
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

import segno
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

from app.db.database import get_db
from app.models.models import Gallery, User, Photo
from app.core.security import get_current_user

router = APIRouter()

class BatchCreateRequest(BaseModel):
    count: int = 50

class GalleryResponse(BaseModel):
    id: uuid.UUID
    short_code: str
    status: str
    created_at: str

@router.get("/", response_model=List[GalleryResponse])
async def list_galleries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Gallery).where(Gallery.photographer_id == current_user.id).order_by(Gallery.created_at.desc())
    result = await db.execute(query)
    galleries = result.scalars().all()
    return [
        {
            "id": g.id,
            "short_code": g.short_code,
            "status": g.status.value,
            "created_at": g.created_at.isoformat()
        } for g in galleries
    ]

@router.post("/batch", response_model=List[GalleryResponse])
async def create_galleries_batch(
    request: BatchCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.count < 1 or request.count > 100:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 100")

    created_galleries = []

    for _ in range(request.count):
        short_code = secrets.token_urlsafe(6)

        gallery = Gallery(
            photographer_id=current_user.id,
            short_code=short_code
        )
        db.add(gallery)
        created_galleries.append(gallery)

    await db.commit()

    return [
        {
            "id": g.id,
            "short_code": g.short_code,
            "status": g.status.value,
            "created_at": g.created_at.isoformat()
        }
        for g in created_galleries
    ]

@router.get("/public/{code}")
async def get_public_gallery_by_code(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Gallery).where(Gallery.short_code == code)
    result = await db.execute(query)
    gallery = result.scalars().first()

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    photo_query = select(Photo).where(Photo.gallery_id == gallery.id)
    photo_result = await db.execute(photo_query)
    photos = photo_result.scalars().all()

    return {
        "id": gallery.id,
        "short_code": gallery.short_code,
        "photographer_id": gallery.photographer_id,
        "status": gallery.status.value,
        "photos": [
            {
                "id": p.id,
                "preview_url": p.thumbnail_s3_key,
                "watermark_url": p.watermark_s3_key,
                "price_cents": 500 # Default price of $5.00 for MVP
            } for p in photos
        ]
    }

class PrintBatchRequest(BaseModel):
    gallery_ids: List[uuid.UUID]

@router.post("/batch-print")
async def generate_qr_pdf(
    request: PrintBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gallery_ids = request.gallery_ids
    if not gallery_ids:
        raise HTTPException(status_code=400, detail="No gallery IDs provided")

    query = select(Gallery).where(Gallery.id.in_(gallery_ids), Gallery.photographer_id == current_user.id)
    result = await db.execute(query)
    galleries = result.scalars().all()

    if len(galleries) != len(gallery_ids):
        raise HTTPException(status_code=404, detail="Some galleries not found or you don't have access")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    margin = 15 * mm
    card_width = 85 * mm
    card_height = 55 * mm

    x_positions = [margin, margin + card_width + 10*mm]
    y_start = A4[1] - margin - card_height
    y_positions = [y_start - i*(card_height + 10*mm) for i in range(4)]

    idx = 0
    for gallery in galleries:
        if idx >= 8:
            c.showPage()
            idx = 0

        row = idx // 2
        col = idx % 2

        x = x_positions[col]
        y = y_positions[row]

        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.rect(x, y, card_width, card_height)

        qr_url = f"http://localhost:3000/en/view/{gallery.short_code}"
        qr = segno.make(qr_url)
        qr_io = io.BytesIO()
        qr.save(qr_io, kind='png', scale=5)
        qr_io.seek(0)

        qr_img = ImageReader(qr_io)
        qr_size = 40 * mm
        c.drawImage(qr_img, x + 5*mm, y + (card_height - qr_size)/2, width=qr_size, height=qr_size)

        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(x + 50*mm, y + 35*mm, "YOUR PHOTOS")

        c.setFont("Helvetica", 9)
        c.drawString(x + 50*mm, y + 25*mm, "Scan the QR code")
        c.drawString(x + 50*mm, y + 20*mm, "to view and buy")

        c.setFont("Helvetica-Oblique", 8)
        c.drawString(x + 50*mm, y + 10*mm, gallery.short_code)

        idx += 1

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=qr_codes.pdf"}
    )
