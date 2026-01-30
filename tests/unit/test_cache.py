import time

from packages.common.cache import CacheKey, L1MemoryCache, MultiLayerCache


def test_cache_namespace_versioning():
  c = MultiLayerCache(L1MemoryCache())
  a = CacheKey("summit:pipeline", "v1", "x")
  b = CacheKey("summit:pipeline", "v2", "x")
  c.set(a, "one", ttl_s=60)
  assert c.get(a) == "one"
  assert c.get(b) is None

def test_l1_eviction_and_expiry():
  l1 = L1MemoryCache(max_items=2)
  l1.set("k1", "v1", ttl_s=60)
  l1.set("k2", "v2", ttl_s=60)
  l1.set("k3", "v3", ttl_s=60)

  # k1 should be evicted (as it was inserted first and all have same TTL relative ordering)
  # Actually logic is `oldest = min(self._store.items(), key=lambda it: it[1][0])[0]`
  # If TTLs are same, expiry times are very close.
  # Let's make it deterministic by setting distinct TTLs.

  l1 = L1MemoryCache(max_items=2)
  l1.set("short", "v1", ttl_s=10)
  l1.set("long", "v2", ttl_s=100)
  # "short" expires sooner.
  l1.set("new", "v3", ttl_s=50)

  # "short" should be evicted because it has min expiry time
  assert l1.get("short") is None
  assert l1.get("long") == "v2"
  assert l1.get("new") == "v3"

def test_expiry():
    l1 = L1MemoryCache(max_items=10)
    l1.set("expired", "val", ttl_s=0.1)
    time.sleep(0.2)
    assert l1.get("expired") is None
