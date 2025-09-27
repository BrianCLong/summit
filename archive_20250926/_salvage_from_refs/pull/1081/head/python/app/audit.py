import json
import os
import time
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Any

import redis
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


def track_audit(action: str, target: str) -> Callable:
    """Decorator that marks a FastAPI endpoint for audit logging."""

    def decorator(func: Callable) -> Callable:
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            return await func(*args, **kwargs)

        wrapper.__audit__ = {"action": action, "target": target}
        return wrapper

    return decorator


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware that writes audit logs to file and Redis."""

    def __init__(self, app):
        super().__init__(app)
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            self.redis = redis.from_url(redis_url, decode_responses=True)
        except Exception:
            self.redis = None

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        route = request.scope.get("route")
        endpoint = getattr(route, "endpoint", None)
        meta = getattr(endpoint, "__audit__", None)
        if meta:
            entry = {
                "user": request.headers.get("x-user", "anonymous"),
                "timestamp": int(time.time()),
                "role": request.headers.get("x-role", "guest"),
                "ip": request.client.host if request.client else None,
                "action": meta["action"],
                "target": meta["target"],
                "session_id": request.headers.get("x-session-id", str(uuid.uuid4())),
            }
            line = json.dumps(entry)
            log_path = Path(os.getenv("AUDIT_LOG_PATH", "audit.log"))
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with log_path.open("a", encoding="utf-8") as f:
                f.write(line + "\n")
            if self.redis:
                try:
                    self.redis.xadd("audit_stream", entry)
                except Exception:
                    pass
        return response
