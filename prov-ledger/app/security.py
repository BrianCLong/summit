from collections.abc import Callable
from functools import wraps

from fastapi import Header, HTTPException

from .config import settings


async def api_key_auth(x_api_key: str | None = Header(default=None)) -> None:
    if settings.AUTH_MODE != "apikey":
        return
    keys = [k.strip() for k in (settings.API_KEYS or "").split(",") if k.strip()]
    if not x_api_key or x_api_key not in keys:
        raise HTTPException(status_code=401, detail="unauthorized")


def require_role(role: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, x_role: str | None = Header(default=None), **kwargs):
            if role and x_role != role:
                raise HTTPException(status_code=403, detail="forbidden")
            return await func(*args, **kwargs)

        return wrapper

    return decorator
