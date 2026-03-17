import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, scan

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="Heitor Scanner API",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)
app.include_router(auth.router)


@app.on_event("startup")
async def startup():
    if settings.DATABASE_URL:
        try:
            from app.database import Base, engine
            import app.db_models  # noqa: F401 — registra models no Base.metadata

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Banco de dados inicializado com sucesso")
        except Exception as e:
            logger.error("Erro ao inicializar banco de dados: %s", e)
    else:
        logger.warning("DATABASE_URL não configurada — persistência desativada")


@app.get("/")
async def root() -> dict:
    return {"message": "Heitor Scanner API", "docs": "/docs"}
