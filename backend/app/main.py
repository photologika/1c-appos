from fastapi import FastAPI
from app.api.routes import photos

app = FastAPI(
    title="Street Photo Platform API",
    description="API for the street photo platform MVP",
    version="0.1.0"
)

# Register routers
app.include_router(photos.router, prefix="/api/v1/galleries", tags=["Photos"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
