import json
import logging
import os
from typing import Any, Optional, Union

import redis

from summit.flags import REDIS_CACHE_ENABLED

logger = logging.getLogger(__name__)

class RedisClient:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(RedisClient, cls).__new__(cls)
        return cls._instance

    def __init__(self, redis_url: Optional[str] = None):
        if not hasattr(self, "initialized"):
            self.enabled = REDIS_CACHE_ENABLED
            if not self.enabled:
                logger.info("Redis cache is disabled via feature flag.")
                return

            self.redis_url = redis_url or os.environ.get("REDIS_URL", "redis://localhost:6379")
            try:
                self.client = redis.Redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    retry_on_timeout=True
                )
                logger.info(f"Redis client initialized with URL: {self.redis_url}")
            except Exception as e:
                logger.error(f"Failed to initialize Redis client: {e}")
                self.enabled = False
            self.initialized = True

    def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None
        try:
            value = self.client.get(key)
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
        except redis.RedisError as e:
            logger.error(f"Redis get error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        if not self.enabled:
            return False
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            return self.client.set(key, value, ex=ttl)
        except redis.RedisError as e:
            logger.error(f"Redis set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        if not self.enabled:
            return False
        try:
            return self.client.delete(key) > 0
        except redis.RedisError as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            return False

    def ping(self) -> bool:
        if not self.enabled:
            return False
        try:
            return self.client.ping()
        except redis.RedisError:
            return False
