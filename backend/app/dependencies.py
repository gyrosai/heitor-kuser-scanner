from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, Request
from pydantic import BaseModel

from app.config import settings


class CurrentUser(BaseModel):
    email: str
    name: str


def get_current_user(request: Request) -> CurrentUser:
    email = request.session.get("user_email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    name = request.session.get("user_name") or email.split("@")[0]
    return CurrentUser(email=email, name=name)


def get_current_user_optional(request: Request) -> CurrentUser | None:
    email = request.session.get("user_email")
    if not email:
        return None
    name = request.session.get("user_name") or email.split("@")[0]
    return CurrentUser(email=email, name=name)


def require_admin_token(x_admin_token: str = Header(default="")) -> None:
    """Protege endpoints administrativos via header X-Admin-Token.

    Fail-closed: se ADMIN_TOKEN não estiver configurado no ambiente, todo
    request é rejeitado (401). Comparação em tempo constante para não vazar o
    token por timing.
    """
    expected = settings.ADMIN_TOKEN
    if not expected or not x_admin_token or not secrets.compare_digest(
        x_admin_token, expected
    ):
        raise HTTPException(status_code=401, detail="Token administrativo inválido")
