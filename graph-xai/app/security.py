from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, HTTPException
import jwt

from .config import get_settings
from .schemas import ExplainRequest


def check_api_key(x_api_key: str = Header(default="")) -> None:
    settings = get_settings()
    if settings.auth_mode != "apikey":
        return
    keys: set[str] = {k.strip() for k in (settings.api_keys or "").split(",") if k.strip()}
    if x_api_key not in keys:
        raise HTTPException(status_code=401, detail="invalid_api_key")


def check_jwt(authorization: str = Header(default="")) -> dict:
    settings = get_settings()
    if settings.auth_mode != "jwt":
        return {}
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="invalid_token")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, settings.jwt_public_key, algorithms=["RS256"])
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=401, detail="invalid_token") from exc


def require_role(role: str) -> Callable:
    async def dependency(payload: dict = Depends(check_jwt)) -> None:
        settings = get_settings()
        if settings.auth_mode != "jwt":
            return
        roles = payload.get("roles", [])
        if role not in roles:
            raise HTTPException(status_code=403, detail="forbidden")

    return dependency


def enforce_limits(req: ExplainRequest) -> None:
    settings = get_settings()
    if len(req.subgraph.nodes) > settings.max_nodes or len(req.subgraph.edges) > settings.max_edges:
        raise HTTPException(status_code=413, detail="graph_too_large")
