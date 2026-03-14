import uuid
import contextvars
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

# Context variable to store correlation ID
correlation_id_ctx = contextvars.ContextVar("correlation_id", default=None)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract correlation ID from headers or generate a new one
        correlation_id = request.headers.get("X-Correlation-ID") or \
                         request.headers.get("X-Request-ID") or \
                         str(uuid.uuid4())

        # Store in context variable
        token = correlation_id_ctx.set(correlation_id)

        # Also add to structlog context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)

        try:
            response = await call_next(request)
            # Return correlation ID in response headers
            response.headers["X-Correlation-ID"] = correlation_id
            return response
        finally:
            correlation_id_ctx.reset(token)

def correlation_id_processor(logger, log_method, event_dict):
    """
    Structlog processor to inject correlation ID into log events.
    """
    correlation_id = correlation_id_ctx.get()
    if correlation_id:
        event_dict["correlation_id"] = correlation_id
    return event_dict
