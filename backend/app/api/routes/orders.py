import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
import stripe

from app.db.database import get_db, async_session_maker
from app.models.models import Photo, Gallery, Order, OrderItem, OrderStatus
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter()

class CheckoutRequest(BaseModel):
    photo_ids: List[str]
    short_code: str

@router.post("/checkout-session")
async def create_checkout_session(
    request: CheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    if not request.photo_ids:
        raise HTTPException(status_code=400, detail="No photos selected")

    query_gal = select(Gallery).where(Gallery.short_code == request.short_code)
    result_gal = await db.execute(query_gal)
    gallery = result_gal.scalar_one_or_none()

    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    try:
        photo_uuids = [uuid.UUID(pid) for pid in request.photo_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid photo ID format")

    query_photos = select(Photo).where(Photo.id.in_(photo_uuids), Photo.gallery_id == gallery.id)
    result_photos = await db.execute(query_photos)
    photos = result_photos.scalars().all()

    if len(photos) != len(photo_uuids):
        raise HTTPException(status_code=400, detail="Some photos were not found in this gallery")

    total_amount = sum(p.price_cents for p in photos)

    new_order = Order(
        gallery_id=gallery.id,
        photographer_id=gallery.photographer_id,
        total_amount_cents=total_amount,
        status=OrderStatus.PENDING,
        stripe_session_id="pending"
    )
    db.add(new_order)
    await db.flush()

    for photo in photos:
        order_item = OrderItem(
            order_id=new_order.id,
            photo_id=photo.id,
            price_cents=photo.price_cents
        )
        db.add(order_item)

    await db.commit()

    line_items = []
    for photo in photos:
        line_items.append({
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'High-Res Street Photo {photo.id}',
                },
                'unit_amount': photo.price_cents,
            },
            'quantity': 1,
        })

    try:
        checkout_session = await stripe.checkout.Session.create_async(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/en/view/{request.short_code}?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/en/view/{request.short_code}?canceled=true",
            metadata={
                'order_id': str(new_order.id),
                'gallery_code': request.short_code
            }
        )

        new_order.stripe_session_id = checkout_session.id
        await db.commit()

        return {"checkout_url": checkout_session.url}
    except Exception as e:
        await db.delete(new_order)
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']

        metadata = session.get('metadata', {})
        order_id_str = metadata.get('order_id')
        customer_email = session.get('customer_details', {}).get('email')

        if order_id_str and customer_email:
            async with async_session_maker() as db_session:
                try:
                    order_uuid = uuid.UUID(order_id_str)

                    query_order = select(Order).where(Order.id == order_uuid)
                    result_order = await db_session.execute(query_order)
                    order = result_order.scalar_one_or_none()

                    if order and order.status != OrderStatus.PAID:
                        order.status = OrderStatus.PAID
                        order.stripe_payment_intent_id = session.get('payment_intent')
                        await db_session.commit()

                        from app.services.s3_client import s3_client

                        query_items = select(OrderItem).where(OrderItem.order_id == order.id)
                        result_items = await db_session.execute(query_items)
                        order_items = result_items.scalars().all()

                        photo_uuids = [item.photo_id for item in order_items]

                        query_photos = select(Photo).where(Photo.id.in_(photo_uuids))
                        result_photos = await db_session.execute(query_photos)
                        photos = result_photos.scalars().all()

                        download_links = []
                        for p in photos:
                            if p.original_s3_key:
                                url = await s3_client.generate_presigned_url(p.original_s3_key, expiration=86400)
                                download_links.append(url)

                        print(f"==========================================")
                        print(f"MOCK EMAIL SENT TO: {customer_email}")
                        print(f"SUBJECT: Your High-Res Street Photos")
                        print(f"BODY: Thank you for your purchase! Here are your download links (valid for 24h):")
                        for link in download_links:
                            print(f"- {link}")
                        print(f"==========================================")
                except Exception as e:
                    print(f"Error fulfilling order: {e}")

    return {"status": "success"}
