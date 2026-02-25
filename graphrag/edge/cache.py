from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


@dataclass
class CacheEntry:
  snippets: list[str]
  prov_uris: list[str]
  expires_at_epoch: int  # only runtime; do not persist deterministically

class EdgeCache:
  def __init__(self) -> None:
    self._m: dict[str, CacheEntry] = {}
  def get(self, key: str) -> Optional[CacheEntry]:
    return self._m.get(key)
  def put(self, key: str, entry: CacheEntry) -> None:
    self._m[key] = entry
