from __future__ import annotations

import json
import logging
import time
from typing import Callable, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class AuditLoggerMiddleware(BaseHTTPMiddleware):
    """Middleware to capture audit trails for database operations."""

    def __init__(
        self,
        app,
        redis_client: Optional[object] = None,
        logger: Optional[logging.Logger] = None,
    ):
        super().__init__(app)
        self.redis = redis_client
        self.logger = logger or logging.getLogger("audit")

    async def dispatch(self, request: Request, call_next: Callable):
        start = time.time()
        response = await call_next(request)
        duration = (time.time() - start) * 1000

        user_role = request.headers.get("X-Role", "anonymous")
        origin = request.client.host if request.client else "unknown"
        operation = "read" if request.method == "GET" else "write"
        db = "neo4j" if request.url.path.startswith("/graph") else "postgres"

        entry = {
            "path": request.url.path,
            "method": request.method,
            "operation": operation,
            "db": db,
            "status": response.status_code,
            "user_role": user_role,
            "origin": origin,
            "duration_ms": duration,
            "timestamp": time.time(),
        }

        self.logger.info("audit", extra={"audit": entry})

        if self.redis:
            try:
                self.redis.publish("audit_log", json.dumps(entry))
            except Exception:  # pragma: no cover - best effort logging
                self.logger.exception("audit_publish_failed")

        return response
