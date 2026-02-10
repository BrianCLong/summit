from datetime import datetime, timezone
from typing import Dict, Any

def get_current_utc_timestamp() -> datetime:
    """Returns the current UTC timestamp."""
    return datetime.now(timezone.utc)

def format_timestamp(dt: datetime) -> str:
    """Formats a datetime object to ISO 8601 string."""
    return dt.isoformat()
