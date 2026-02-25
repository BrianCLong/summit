import time
from typing import List, Optional

from graphrag.edge.cache import CacheEntry, EdgeCache


class EdgeService:
    def __init__(self, cache: EdgeCache):
        self.cache = cache

    def get_context(self, query: str) -> Optional[list[str]]:
        key = query
        entry = self.cache.get(key)
        if entry:
            if entry.expires_at_epoch > time.time():
                # Enforce filters
                if self._contains_pii_or_injection(entry.snippets):
                    # In production this would log/escalate
                    return None
                return entry.snippets
        return None

    def _contains_pii_or_injection(self, snippets: list[str]) -> bool:
        # Stub filter logic
        for s in snippets:
            if "PII" in s or "DROP TABLE" in s:
                return True
        return False
