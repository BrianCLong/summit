import hashlib
import hmac
import logging
import os
import secrets
import time
from functools import wraps
from typing import Any

import jwt
from fastapi import HTTPException, Request
from jose import JWTError

logger = logging.getLogger(__name__)

# Security Configuration
ML_WEBHOOK_SECRET = os.getenv("ML_WEBHOOK_SECRET", "change-me")
JWT_PUBLIC_KEY = os.getenv("JWT_PUBLIC_KEY", "")
JWT_ALGORITHM = "RS256"
MAX_PAYLOAD_SIZE = 10 * 1024 * 1024  # 10MB
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 3600  # 1 hour

# Rate limiting storage (in production, use Redis)
_rate_limit_storage: dict[str, dict[str, Any]] = {}


def sign_payload(payload_bytes: bytes) -> str:
    """Create HMAC signature for webhook payload"""
    if not ML_WEBHOOK_SECRET or ML_WEBHOOK_SECRET == "change-me":
        logger.warning("Using default ML_WEBHOOK_SECRET - this is insecure!")

    sig = hmac.new(ML_WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return sig


def verify_hmac_signature(payload: bytes, signature: str) -> bool:
    """Verify HMAC signature using timing-safe comparison"""
    if not signature:
        return False

    expected_sig = sign_payload(payload)
    try:
        return hmac.compare_digest(expected_sig, signature)
    except Exception as e:
        logger.warning(f"HMAC verification failed: {e}")
        return False


def validate_jwt_token(token: str) -> dict[str, Any]:
    """Validate JWT token and return payload"""
    if not JWT_PUBLIC_KEY:
        logger.warning("No JWT_PUBLIC_KEY configured - token validation disabled")
        return {"sub": "anonymous", "roles": []}

    try:
        payload = jwt.decode(token, JWT_PUBLIC_KEY, algorithms=[JWT_ALGORITHM])

        # Check token expiration
        if "exp" in payload and payload["exp"] < time.time():
            raise HTTPException(status_code=401, detail="Token expired")

        # Validate required claims
        if "sub" not in payload:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")

        return payload
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def check_payload_size(request: Request) -> None:
    """Check if request payload exceeds maximum size"""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_PAYLOAD_SIZE:
        raise HTTPException(
            status_code=413, detail=f"Payload too large. Maximum size: {MAX_PAYLOAD_SIZE} bytes"
        )


def rate_limit_check(
    identifier: str, limit: int = RATE_LIMIT_REQUESTS, window: int = RATE_LIMIT_WINDOW
) -> bool:
    """Simple in-memory rate limiting (use Redis in production)"""
    now = time.time()

    # Clean old entries
    for key in list(_rate_limit_storage.keys()):
        if _rate_limit_storage[key]["window_start"] + window < now:
            del _rate_limit_storage[key]

    # Check current rate
    if identifier not in _rate_limit_storage:
        _rate_limit_storage[identifier] = {"count": 1, "window_start": now}
        return True

    entry = _rate_limit_storage[identifier]
    if entry["window_start"] + window < now:
        # Reset window
        entry["count"] = 1
        entry["window_start"] = now
        return True

    if entry["count"] >= limit:
        return False

    entry["count"] += 1
    return True


def sanitize_input(data: Any) -> Any:
    """Sanitize input data to prevent injection attacks"""
    if isinstance(data, str):
        # Remove potentially dangerous characters
        dangerous_chars = ["<", ">", '"', "'", "&", "\x00"]
        for char in dangerous_chars:
            data = data.replace(char, "")

        # Limit string length
        if len(data) > 10000:
            data = data[:10000]

    elif isinstance(data, dict):
        return {
            key: sanitize_input(value)
            for key, value in data.items()
            if key.startswith("_") is False
        }

    elif isinstance(data, list):
        return [sanitize_input(item) for item in data[:1000]]  # Limit list size

    return data


def validate_graph_data(graph_data: dict[str, Any]) -> dict[str, Any]:
    """Validate and sanitize graph data structure"""
    if not isinstance(graph_data, dict):
        raise HTTPException(status_code=400, detail="Graph data must be a dictionary")

    # Check for required fields
    if "nodes" not in graph_data and "edges" not in graph_data:
        raise HTTPException(status_code=400, detail="Graph data must contain 'nodes' or 'edges'")

    # Validate nodes
    if "nodes" in graph_data:
        nodes = graph_data["nodes"]
        if not isinstance(nodes, list):
            raise HTTPException(status_code=400, detail="Nodes must be a list")

        if len(nodes) > 10000:
            raise HTTPException(status_code=400, detail="Too many nodes (max: 10000)")

        for i, node in enumerate(nodes):
            if not isinstance(node, dict) or "id" not in node:
                raise HTTPException(status_code=400, detail=f"Invalid node at index {i}")

    # Validate edges
    if "edges" in graph_data:
        edges = graph_data["edges"]
        if not isinstance(edges, list):
            raise HTTPException(status_code=400, detail="Edges must be a list")

        if len(edges) > 50000:
            raise HTTPException(status_code=400, detail="Too many edges (max: 50000)")

        for i, edge in enumerate(edges):
            if not isinstance(edge, (list, dict)):
                raise HTTPException(status_code=400, detail=f"Invalid edge at index {i}")

            if isinstance(edge, list) and len(edge) < 2:
                raise HTTPException(
                    status_code=400, detail=f"Edge at index {i} must have at least 2 elements"
                )

            if isinstance(edge, dict) and ("source" not in edge or "target" not in edge):
                raise HTTPException(
                    status_code=400, detail=f"Edge at index {i} must have 'source' and 'target'"
                )

    return sanitize_input(graph_data)


def audit_security_event(
    event_type: str, details: dict[str, Any], severity: str = "medium"
) -> None:
    """Log security events for auditing"""
    logger.warning(f"SECURITY_EVENT: {event_type} | Severity: {severity} | Details: {details}")


def secure_random_string(length: int = 32) -> str:
    """Generate cryptographically secure random string"""
    return secrets.token_urlsafe(length)


def optional_spacy():
    """Load spaCy model if enabled"""
    if os.getenv("USE_SPACY", "false").lower() == "true":
        try:
            import spacy

            return spacy.load("en_core_web_sm")
        except Exception as e:
            logger.warning(f"Failed to load spaCy model: {e}")
            return None
    return None


# Security middleware decorator
def security_middleware(func):
    """Decorator to add security checks to endpoints"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        request = kwargs.get("request") or args[0] if args else None

        if request:
            # Check payload size
            check_payload_size(request)

            # Rate limiting (based on IP)
            client_ip = request.client.host if request.client else "unknown"
            if not rate_limit_check(client_ip):
                audit_security_event(
                    "RATE_LIMIT_EXCEEDED", {"ip": client_ip, "endpoint": request.url.path}, "high"
                )
                raise HTTPException(status_code=429, detail="Rate limit exceeded")

        return await func(*args, **kwargs)

    return wrapper


# Input validation schemas
class SecurityConfig:
    """Security configuration and validation"""

    @staticmethod
    def validate_job_id(job_id: str) -> str:
        """Validate job ID format"""
        if not job_id or len(job_id) > 100:
            raise HTTPException(status_code=400, detail="Invalid job ID")

        # Check for valid UUID format (optional but recommended)
        import re

        uuid_pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        if not re.match(uuid_pattern, job_id, re.IGNORECASE):
            logger.warning(f"Job ID doesn't match UUID pattern: {job_id}")

        return job_id

    @staticmethod
    def validate_callback_url(url: str) -> str:
        """Validate callback URL"""
        if not url:
            return url

        # Basic URL validation
        if not url.startswith(("http://", "https://")):
            raise HTTPException(status_code=400, detail="Invalid callback URL scheme")

        if len(url) > 2000:
            raise HTTPException(status_code=400, detail="Callback URL too long")

        # Prevent SSRF by blocking private networks
        import urllib.parse

        parsed = urllib.parse.urlparse(url)
        if parsed.hostname in ["localhost", "127.0.0.1", "0.0.0.0"]:
            if not os.getenv("ALLOW_LOCALHOST_CALLBACKS", "false").lower() == "true":
                raise HTTPException(status_code=400, detail="Localhost callbacks not allowed")

        return url
