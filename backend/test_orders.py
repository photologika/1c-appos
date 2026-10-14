import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
import stripe

client = TestClient(app)

def test_checkout_session_no_photos():
    response = client.post("/api/v1/orders/checkout-session", json={"photo_ids": [], "short_code": "TEST"})
    assert response.status_code == 400
    assert "No photos selected" in response.text

def test_webhook_invalid_signature():
    # Attempting to call webhook without valid signature
    response = client.post("/api/v1/orders/webhook", headers={"stripe-signature": "invalid"}, json={"type": "checkout.session.completed"})
    assert response.status_code == 400
    assert "Invalid payload" in response.text or "Invalid signature" in response.text

print("Orders tests constructed ok")
