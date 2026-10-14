from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, galleries, photos

app = FastAPI(
    title="Street Photo Platform API",
    description="API for the street photo platform MVP",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(galleries.router, prefix="/api/v1/galleries", tags=["Galleries"])
app.include_router(photos.router, prefix="/api/v1/photos", tags=["Photos"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
