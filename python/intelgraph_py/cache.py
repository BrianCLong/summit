import hashlib
import json
import os
from typing import Any

import redis

# Initialize Redis client
# Use environment variables for configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

try:
    redis_client = redis.StrictRedis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,  # Decodes responses to strings
    )
    # Test connection
    redis_client.ping()
    print("Connected to Redis successfully!")
except redis.exceptions.ConnectionError as e:
    print(f"Could not connect to Redis: {e}")
    redis_client = None  # Set to None if connection fails


def generate_cache_key(
    insight_data: dict[str, Any], llm_model: str, authority: str = "internal"
) -> str:
    """Generates a consistent cache key from insight data, model, and authority."""
    # Ensure dictionary is sorted for consistent hashing
    sorted_insight_data = json.dumps(insight_data, sort_keys=True)
    combined_string = f"{sorted_insight_data}-{llm_model}-{authority}"
    return hashlib.sha256(combined_string.encode("utf-8")).hexdigest()


def get_cached_explanation(cache_key: str) -> dict[str, Any] | None:
    """Retrieves a cached explanation from Redis."""
    if redis_client:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            print(f"Cache hit for key: {cache_key}")
            return json.loads(cached_data)
    return None


def set_cached_explanation(cache_key: str, explanation: dict[str, Any], ex: int = 3600):
    """Stores an explanation in Redis cache. Default expiry is 1 hour."""
    if redis_client:
        redis_client.setex(cache_key, ex, json.dumps(explanation))
        print(f"Explanation cached for key: {cache_key}")
