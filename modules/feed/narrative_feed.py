from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class FeedItem:
    narrative_id: str
    score_0_100: int
    confidence_0_1: float
    drivers: list[str]     # signal keys
    brief_line: str        # deterministic template
    audit: dict[str, Any]

def build_feed(items: list[FeedItem]) -> list[FeedItem]:
    # Sort by score descending, then confidence descending
    items = list(items)
    items.sort(key=lambda x: (x.score_0_100, x.confidence_0_1), reverse=True)
    return items
