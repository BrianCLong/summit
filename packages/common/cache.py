import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple


@dataclass(frozen=True)
class CacheKey:
  namespace: str
  schema_version: str
  key: str
  def full(self) -> str:
    return f"{self.namespace}:{self.schema_version}:{self.key}"

class L1MemoryCache:
  def __init__(self, max_items: int = 1024):
    self.max_items = max_items
    self._store: dict[str, tuple[float, object]] = {}

  def get(self, k: str) -> Optional[object]:
    v = self._store.get(k)
    if not v:
        return None
    exp, obj = v
    if time.time() > exp:
      self._store.pop(k, None)
      return None
    return obj

  def set(self, k: str, obj: object, ttl_s: int) -> None:
    if ttl_s <= 0:
        return
    if len(self._store) >= self.max_items:
      # deterministic-ish eviction: drop oldest key by expiry
      if self._store:
        oldest = min(self._store.items(), key=lambda it: it[1][0])[0]
        self._store.pop(oldest, None)
    self._store[k] = (time.time() + ttl_s, obj)

class MultiLayerCache:
  def __init__(self, l1: L1MemoryCache, l2=None):
    self.l1 = l1
    self.l2 = l2  # TODO: wire Redis client cleanly later

  def get(self, ck: CacheKey) -> Optional[object]:
    fk = ck.full()
    hit = self.l1.get(fk)
    if hit is not None:
      return hit
    if self.l2 is None:
      return None
    # TODO: l2.get + deserialize + populate l1
    return None

  def set(self, ck: CacheKey, obj: object, ttl_s: int) -> None:
    fk = ck.full()
    self.l1.set(fk, obj, ttl_s)
    if self.l2 is None:
      return
    # TODO: l2.set + TTL
