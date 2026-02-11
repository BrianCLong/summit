from typing import Any, Optional
from summit.cache.redis_client import RedisClient

class CacheService:
    def __init__(self):
        self.redis = RedisClient()

    async def get(self, key: str) -> Optional[Any]:
        return self.redis.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        return self.redis.set(key, value, ttl)

    async def delete(self, key: str) -> bool:
        return self.redis.delete(key)
