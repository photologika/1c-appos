import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class UserRole(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    PHOTOGRAPHER = "PHOTOGRAPHER"


class GalleryStatus(str, enum.Enum):
    EMPTY = "EMPTY"
    UPLOADING = "UPLOADING"
    READY = "READY"
    ARCHIVED = "ARCHIVED"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    stripe_account_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    galleries = relationship("Gallery", back_populates="photographer")
    photos = relationship("Photo", back_populates="photographer")


class Gallery(Base):
    __tablename__ = "galleries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photographer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    short_code = Column(String, unique=True, index=True, nullable=False)
    status = Column(Enum(GalleryStatus), default=GalleryStatus.EMPTY, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    photographer = relationship("User", back_populates="galleries")
    photos = relationship("Photo", back_populates="gallery")
    orders = relationship("Order", back_populates="gallery")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gallery_id = Column(UUID(as_uuid=True), ForeignKey("galleries.id"), nullable=False)
    photographer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_s3_key = Column(String, nullable=False)
    watermark_s3_key = Column(String, nullable=False)
    thumbnail_s3_key = Column(String, nullable=False)
    price_cents = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    gallery = relationship("Gallery", back_populates="photos")
    photographer = relationship("User", back_populates="photos")
    order_items = relationship("OrderItem", back_populates="photo")


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gallery_id = Column(UUID(as_uuid=True), ForeignKey("galleries.id"), nullable=False)
    client_email = Column(String, nullable=False)
    total_amount_cents = Column(Integer, nullable=False)
    stripe_payment_intent_id = Column(String, unique=True, index=True, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    gallery = relationship("Gallery", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), primary_key=True)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"), primary_key=True)

    # Relationships
    order = relationship("Order", back_populates="items")
    photo = relationship("Photo", back_populates="order_items")
