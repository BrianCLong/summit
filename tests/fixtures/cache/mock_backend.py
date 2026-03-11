import time

class MockCacheBackend:
    """
    Mock Cache Backend for testing caching layer functionality.
    Features TTL expiration, capacity limits, and deterministic eviction.
    """
    def __init__(self, max_memory_items=100):
        self.store = {}
        self.max_items = max_memory_items
        self.expirations = {}

    def get(self, key):
        if key in self.store:
            if key in self.expirations and time.time() > self.expirations[key]:
                self.delete(key)
                return None
            return self.store[key]
        return None

    def set(self, key, value, ttl=None):
        if len(self.store) >= self.max_items and key not in self.store:
            self._evict()

        self.store[key] = value
        if ttl is not None:
            self.expirations[key] = time.time() + ttl
        elif key in self.expirations:
            del self.expirations[key]

    def delete(self, key):
        if key in self.store:
            del self.store[key]
        if key in self.expirations:
            del self.expirations[key]

    def _evict(self):
        # Evict oldest item (first item in dict, Python 3.7+ preserves insertion order)
        # or expired items first
        now = time.time()
        expired_keys = [k for k, v in self.expirations.items() if now > v]
        if expired_keys:
            for k in expired_keys:
                self.delete(k)
            if len(self.store) < self.max_items:
                return

        # Simple FIFO eviction
        if self.store:
            first_key = next(iter(self.store))
            self.delete(first_key)

    def clear(self):
        self.store.clear()
        self.expirations.clear()
