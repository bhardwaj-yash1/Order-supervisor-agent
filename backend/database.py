from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from backend.config import settings

# Determine engine options based on DB type
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Async engine for FastAPI
engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for Temporal activities
if is_sqlite:
    sync_db_url = settings.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
else:
    sync_db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")
sync_engine = create_engine(sync_db_url, echo=False, connect_args=connect_args)
SyncSession = sessionmaker(sync_engine)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session_maker() as session:
        yield session

def get_sync_session():
    return SyncSession()

async def init_db():
    from . import models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
