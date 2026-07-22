import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from backend.config import settings

# Async engine for FastAPI
engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for Temporal activities
sync_db_url = settings.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
sync_engine = create_engine(sync_db_url, echo=False)
SyncSession = sessionmaker(sync_engine)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session_maker() as session:
        yield session

def get_sync_session():
    return SyncSession()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
