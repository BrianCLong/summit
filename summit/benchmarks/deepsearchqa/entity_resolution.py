from __future__ import annotations

import re
from typing import List, Set


def canonicalize(item: str) -> str:
    """
    Applies heuristic normalization to an entity string.
    - Casefolding
    - Punctuation removal
    - Whitespace normalization
    """
    if not item:
        return ""

    # 1. Casefold
    item = item.casefold()

    # 2. Remove punctuation (keep alphanumeric and spaces)
    item = re.sub(r'[^\w\s]', '', item)

    # 3. Normalize whitespace
    item = " ".join(item.split())

    return item

class EntityResolver:
    """
    Handles deduplication and entity resolution for a list of items.
    """
    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def resolve(self, items: list[str]) -> list[str]:
        """
        Deduplicates a list of items based on their canonical form.
        Preserves original casing/formatting of the first occurrence.
        """
        if not self.enabled:
            return items

        seen_canonical: set[str] = set()
        resolved_items: list[str] = []

        for item in items:
            canon = canonicalize(item)
            if canon and canon not in seen_canonical:
                seen_canonical.add(canon)
                resolved_items.append(item)

        return resolved_items
