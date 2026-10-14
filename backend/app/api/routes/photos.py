import os
import uuid
import asyncio
from typing import List
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db, async_session_maker
from app.models.models import Photo, Gallery, User
from app.core.security import get_current_user
from app.services.s3_client import s3_client
from app.services.image_processor import image_processor

router = APIRouter()

async def process_and_upload_photo(
    gallery_id: str,
    file_bytes: bytes,
    filename: str,
    photographer_id: str
):
    # Unique base ID for the photo
    photo_uuid = str(uuid.uuid4())
    base_name = f"{gallery_id}/{photo_uuid}"

    # Run CPU-bound image processing in thread pool to avoid blocking the event loop
    loop = asyncio.get_running_loop()
    thumbnail_bytes = await loop.run_in_executor(None, image_processor.create_thumbnail, file_bytes)
    watermark_bytes = await loop.run_in_executor(None, image_processor.apply_watermark, file_bytes)

    # File extension handling
    ext = os.path.splitext(filename)[1].lower()
    if not ext:
        ext = ".jpg"

    # Upload to S3 concurrently
    original_key = f"{base_name}_original{ext}"
    watermark_key = f"{base_name}_watermark.jpg"
    thumbnail_key = f"{base_name}_thumb.webp"

    await asyncio.gather(
        s3_client.upload_file(file_bytes, original_key, "application/octet-stream"),
        s3_client.upload_file(watermark_bytes, watermark_key, "image/jpeg"),
        s3_client.upload_file(thumbnail_bytes, thumbnail_key, "image/webp"),
    )

    # Save to database in a short-lived dedicated session
    async with async_session_maker() as db_session:
        new_photo = Photo(
            id=uuid.UUID(photo_uuid),
            gallery_id=uuid.UUID(gallery_id),
            photographer_id=uuid.UUID(photographer_id),
            original_s3_key=original_key,
            watermark_s3_key=watermark_key,
            thumbnail_s3_key=thumbnail_key,
            price_cents=500  # Example fixed price
        )

        db_session.add(new_photo)
        await db_session.commit()

@router.post("/{gallery_id}/upload")
async def upload_photos(
    gallery_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure gallery exists and belongs to the current user
    try:
        gallery_uuid = uuid.UUID(gallery_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid gallery ID format")

    query = select(Gallery).where(Gallery.id == gallery_uuid)
    result = await db.execute(query)
    gallery = result.scalar_one_or_none()

    if not gallery or gallery.photographer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Gallery not found or access denied")

    photographer_id = str(gallery.photographer_id)

    # In a real app with batch uploads, we would stream these or put them in a message queue (like Celery/Redis)
    # Reading all into memory is acceptable for a small MVP to release the connection early, but dangerous for large batches.
    for file in files:
        file_bytes = await file.read()
        background_tasks.add_task(
            process_and_upload_photo,
            gallery_id=gallery_id,
            file_bytes=file_bytes,
            filename=file.filename,
            photographer_id=photographer_id
        )

    return {"message": f"Upload started for {len(files)} files"}
