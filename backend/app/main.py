import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.routers import auth, email, scan, transcribe

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="CIMI Leads API",
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

is_prod = settings.ENV == "production"
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    same_site="lax",
    https_only=is_prod,
    max_age=60 * 60 * 24 * 30,
)

app.include_router(scan.router)
app.include_router(auth.router)
app.include_router(transcribe.router)
app.include_router(email.router)


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
    return {"message": "CIMI Leads API", "docs": "/docs"}
