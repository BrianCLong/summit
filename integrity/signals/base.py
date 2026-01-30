from dataclasses import dataclass
from typing import Any, Dict, Iterable


@dataclass(frozen=True)
class Event:
    # Minimal, privacy-preserving event shape (no raw text)
    ts_ms: int
    actor_id: str
    action: str          # e.g., "post", "reply", "mention", "like"
    target_id: str | None
    community_id: str | None

def extract(events: Iterable[Event]) -> dict[str, Any]:
    """
    Returns derived aggregates for downstream detectors.
    Keep deterministic: no timestamps, no randomness.
    """
    raise NotImplementedError("signals.extract must be implemented by concrete modules")
