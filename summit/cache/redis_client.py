import os
import json
import logging
import redis
from typing import Optional, Any, Union, List, Dict, Iterator
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

    def mget(self, keys: List[str]) -> List[Optional[Any]]:
        if not self.enabled:
            return [None] * len(keys)
        try:
            values = self.client.mget(keys)
            decoded_values = []
            for value in values:
                if value:
                    try:
                        decoded_values.append(json.loads(value))
                    except json.JSONDecodeError:
                        decoded_values.append(value)
                else:
                    decoded_values.append(None)
            return decoded_values
        except redis.RedisError as e:
            logger.error(f"Redis mget error for keys {keys}: {e}")
            return [None] * len(keys)

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

    def mset(self, mapping: Dict[str, Any], ttl: int = 3600) -> bool:
        if not self.enabled:
            return False
        try:
            # Prepare mapping with JSON encoding if necessary
            encoded_mapping = {}
            for k, v in mapping.items():
                if isinstance(v, (dict, list)):
                    encoded_mapping[k] = json.dumps(v)
                else:
                    encoded_mapping[k] = v

            # Use pipeline to make it atomic-ish (mset doesn't support TTL per key directly)
            pipe = self.client.pipeline()
            pipe.mset(encoded_mapping)
            for k in encoded_mapping:
                pipe.expire(k, ttl)
            pipe.execute()
            return True
        except redis.RedisError as e:
            logger.error(f"Redis mset error: {e}")
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

    def pipeline(self):
        if not self.enabled:
             # Return a mock pipeline if disabled? Or just None?
             # For now, let's return a dummy context manager if disabled to avoid breaking code
             class MockPipeline:
                 def __enter__(self): return self
                 def __exit__(self, exc_type, exc_val, exc_tb): pass
                 def execute(self): return []
                 def __getattr__(self, name):
                     def method(*args, **kwargs): return self
                     return method
             return MockPipeline()
        return self.client.pipeline()

    def scan_iter(self, match: Optional[str] = None, count: Optional[int] = None) -> Iterator[str]:
        if not self.enabled:
            return iter([])
        try:
            return self.client.scan_iter(match=match, count=count)
        except redis.RedisError as e:
            logger.error(f"Redis scan_iter error: {e}")
            return iter([])

    def ttl(self, key: str) -> int:
        if not self.enabled:
            return -2
        try:
            return self.client.ttl(key)
        except redis.RedisError as e:
            logger.error(f"Redis ttl error for key {key}: {e}")
            return -2
