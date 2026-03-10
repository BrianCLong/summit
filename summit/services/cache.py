from typing import Any, Optional

from summit.cache.redis_client import RedisClient


class CacheService:
    def __init__(self):
        # Initialize CacheService using the 'cache' partition
        self.redis = RedisClient(partition="cache")

    async def get(self, key: str) -> Optional[Any]:
        # redis_client operations are synchronous, so we don't strictly need await here,
        # but maintaining the original async interface
        return self.redis.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        return self.redis.set(key, value, ttl)

    async def delete(self, key: str) -> bool:
        return self.redis.delete(key)
