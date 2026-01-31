from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

EventType = Literal["post", "reshare", "reply", "mention"]

@dataclass(frozen=True)
class StreamEvent:
    event_type: EventType
    platform: str
    actor_id: str            # stable internal id (hashed upstream)
    content_id: str          # stable internal id (hashed upstream)
    parent_content_id: Optional[str]
    ts_ms: int               # epoch millis
    mentioned_actor_id: Optional[str] = None
    actor_is_verified: Optional[bool] = None
    actor_age_days: Optional[int] = None
