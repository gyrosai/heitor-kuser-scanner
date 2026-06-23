from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000"  # default só pra dev local
    ENV: str = "development"
    PORT: int = 8000
    DATABASE_URL: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    FRONTEND_URL: str = ""
    SESSION_SECRET_KEY: str = ""

    EMAIL_DAILY_LIMIT: int = 500
    MEDIA_KIT_DIR: str = "./assets"
    
    @property
    def origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        if self.ENV == "production" and "*" in origins:
            raise ValueError(
                "ALLOWED_ORIGINS cannot include '*' in production with credentials. "
                "Set explicit origins like 'https://your-frontend.vercel.app'"
            )
        return origins

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
