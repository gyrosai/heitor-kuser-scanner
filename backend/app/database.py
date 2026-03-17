from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = None
async_session = None


class Base(DeclarativeBase):
    pass


if settings.DATABASE_URL:
    from sqlalchemy.ext.asyncio import (
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )

    # Converter postgres:// para postgresql+asyncpg://
    database_url = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )

    engine = create_async_engine(database_url, echo=False)
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )


async def get_db():
    if async_session is None:
        yield None
        return
    async with async_session() as session:
        yield session
