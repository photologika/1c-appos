import sys
import asyncio
from fastapi.testclient import TestClient
from app.main import app
import jwt
print("TestClient and App instantiated OK")
client = TestClient(app)
response = client.get("/health")
print(response.json())
