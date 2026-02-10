from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

@dataclass
class CacheEntry:
  snippets: List[str]
  prov_uris: List[str]
  expires_at_epoch: int  # only runtime; do not persist deterministically

class EdgeCache:
  def __init__(self) -> None:
    self._m: Dict[str, CacheEntry] = {}
  def get(self, key: str) -> Optional[CacheEntry]:
    return self._m.get(key)
  def put(self, key: str, entry: CacheEntry) -> None:
    self._m[key] = entry
