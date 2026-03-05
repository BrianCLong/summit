from dataclasses import dataclass
from typing import List, Optional

@dataclass
class EntityAlias:
    alias_id: str
    canonical_id: str
    confidence: float
    source_ref: Optional[str] = None

class AliasTable:
    def __init__(self):
        self._table: List[EntityAlias] = []

    def add_alias(self, alias: EntityAlias) -> None:
        self._table.append(alias)

    def resolve(self, alias_id: str) -> Optional[str]:
        for entry in sorted(self._table, key=lambda x: x.confidence, reverse=True):
            if entry.alias_id == alias_id:
                return entry.canonical_id
        return None
