import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# The database URL would typically come from environment variables.
# Example: "postgresql+asyncpg://user:password@localhost:5432/street_photo_platform"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost:5432/street_photo_platform"
)

# Create an async SQLAlchemy engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create a sessionmaker for async sessions
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

# Base class for declarative models
Base = declarative_base()

# Dependency for FastAPI to get a database session
async def get_db():
    async with async_session_maker() as session:
        yield session
