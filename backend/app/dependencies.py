from fastapi import HTTPException, Request
from pydantic import BaseModel


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
