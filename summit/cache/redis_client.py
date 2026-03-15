import json
import logging
import os
from typing import Any, Optional, Union, Iterator

import redis
try:
    from redis.cluster import RedisCluster, ClusterNode
except ImportError:
    RedisCluster = None
    ClusterNode = None

from summit.flags import REDIS_CACHE_ENABLED

logger = logging.getLogger(__name__)

class DummyPipeline:
    def __init__(self):
        self.call_count = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def __getattr__(self, name):
        def method(*args, **kwargs):
            self.call_count += 1
            return self
        return method

    def execute(self):
        res = [None] * self.call_count
        self.call_count = 0
        return res

class RedisClient:
    _instances = {}

    def __new__(cls, partition: str = "default", redis_url: Optional[str] = None):
        if partition not in cls._instances:
            cls._instances[partition] = super(RedisClient, cls).__new__(cls)
        return cls._instances[partition]

    def __init__(self, partition: str = "default", redis_url: Optional[str] = None):
        # We only want to initialize once per partition
        if not hasattr(self, "initialized"):
            self.partition = partition
            self.enabled = REDIS_CACHE_ENABLED
            if not self.enabled:
                logger.info("Redis cache is disabled via feature flag.")
                return

            prefix = f"REDIS_{partition.upper()}_" if partition != "default" else "REDIS_"

            use_cluster = os.environ.get(f"{prefix}USE_CLUSTER", "false").lower() == "true"
            nodes_env = os.environ.get(f"{prefix}CLUSTER_NODES", "")

            host = os.environ.get(f"{prefix}HOST", os.environ.get("REDIS_HOST", "localhost"))
            port = os.environ.get(f"{prefix}PORT", os.environ.get("REDIS_PORT", "6379"))
            password = os.environ.get(f"{prefix}PASSWORD", os.environ.get("REDIS_PASSWORD", ""))

            # Use redis_url if explicitly provided, else construct from env
            if not redis_url:
                auth = f":{password}@" if password else ""
                self.redis_url = f"redis://{auth}{host}:{port}"
            else:
                self.redis_url = redis_url

            try:
                if use_cluster and nodes_env and RedisCluster is not None:
                    startup_nodes = []
                    for node in nodes_env.split(','):
                        n_host, n_port = node.split(':')
                        startup_nodes.append(ClusterNode(n_host, int(n_port)))

                    self.client = RedisCluster(
                        startup_nodes=startup_nodes,
                        password=password if password else None,
                        decode_responses=True,
                        socket_connect_timeout=2
                    )
                    logger.info(f"Redis Cluster initialized for partition '{partition}' with nodes: {nodes_env}")
                else:
                    self.client = redis.Redis.from_url(
                        self.redis_url,
                        decode_responses=True,
                        socket_connect_timeout=2,
                        retry_on_timeout=True
                    )
                    logger.info(f"Redis client initialized for partition '{partition}' with URL: {self.redis_url}")
            except Exception as e:
                logger.error(f"Failed to initialize Redis client for partition '{partition}': {e}")
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

    def mget(self, keys: list[str]) -> list[Optional[Any]]:
        if not self.enabled or not keys:
            return [None] * len(keys)
        try:
            values = self.client.mget(keys)
            results = []
            for value in values:
                if value:
                    try:
                        results.append(json.loads(value))
                    except (json.JSONDecodeError, TypeError):
                        results.append(value)
                else:
                    results.append(None)
            return results
        except redis.RedisError as e:
            logger.error(f"Redis mget error: {e}")
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

    def mset(self, mapping: dict[str, Any], ttl: Optional[int] = None) -> bool:
        if not self.enabled or not mapping:
            return False
        try:
            processed_mapping = {}
            for k, v in mapping.items():
                if isinstance(v, (dict, list)):
                    processed_mapping[k] = json.dumps(v)
                else:
                    processed_mapping[k] = v

            pipe = self.client.pipeline()
            pipe.mset(processed_mapping)
            if ttl is not None:
                for k in processed_mapping.keys():
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

    def scan_iter(self, match: Optional[str] = None, count: Optional[int] = None) -> Iterator[str]:
        if not self.enabled:
            return iter([])
        try:
            # RedisCluster supports scan_iter across all nodes in recent redis-py versions
            kwargs = {}
            if match is not None:
                kwargs['match'] = match
            if count is not None:
                kwargs['count'] = count
            return self.client.scan_iter(**kwargs)
        except redis.RedisError as e:
            logger.error(f"Redis scan_iter error: {e}")
            return iter([])

    def pipeline(self):
        if not self.enabled:
            return DummyPipeline()
        try:
            return self.client.pipeline()
        except redis.RedisError as e:
            logger.error(f"Redis pipeline error: {e}")
            return DummyPipeline()

    def ttl(self, key: str) -> int:
        if not self.enabled:
            return -2
        try:
            return self.client.ttl(key)
        except redis.RedisError as e:
            logger.error(f"Redis ttl error for key {key}: {e}")
            return -2
