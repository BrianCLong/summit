from __future__ import annotations

import uuid
from typing import Any

from .config import get_settings
from .redact import redact

settings = get_settings()


def log_audit(method: str, req: dict[str, Any], outcome: str) -> str:
    audit_id = f"xai_{uuid.uuid4().hex[:8]}"
    if not settings.audit_to_db:
        print("AUDIT", audit_id, redact(str(req)), outcome)
    else:  # pragma: no cover
        pass
    return audit_id
