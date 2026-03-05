import hashlib
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from .moment import Moment
from .policy import AmbientPolicy


def ingest_moment(raw_data: dict[str, Any], policy: AmbientPolicy) -> Optional[Moment]:
    """
    Ingests raw capture data, normalizes into Moment, applies policy exclusions and redactions,
    and assigns id/hash.
    Returns the Moment if allowed, else None.
    """
    # Expected minimal fields
    source_app = raw_data.get("source_app", "unknown")
    uri = raw_data.get("uri", "unknown")

    # Policy check for exclusions
    if not policy.evaluate_exclusions(source_app, uri):
        return None

    # Get text and redact
    raw_text = raw_data.get("text", "")
    redacted_text = policy.redact_sensitive_data(raw_text)

    # Calculate hash based on text for deduplication
    content_hash = hashlib.sha256(redacted_text.encode('utf-8')).hexdigest()

    # Parse timestamp or use current
    ts_str = raw_data.get("timestamp")
    if ts_str:
        if isinstance(ts_str, datetime):
            timestamp = ts_str
        else:
            try:
                timestamp = datetime.fromisoformat(str(ts_str))
            except ValueError:
                timestamp = datetime.now()
    else:
        timestamp = datetime.now()

    return Moment(
        id=str(uuid.uuid4()),
        timestamp=timestamp,
        source_app=source_app,
        uri=uri,
        title=raw_data.get("title", "Untitled"),
        text=redacted_text,
        metadata=raw_data.get("metadata", {}),
        sensitivity_tags=raw_data.get("sensitivity_tags", []),
        content_hash=content_hash
    )
