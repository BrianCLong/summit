import hashlib
import json
import os
from abc import ABC, abstractmethod

import redis

# Assuming REDIS_URL is available from environment or config
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(REDIS_URL)
            redis_client.ping()
            print("LLM Provider: Successfully connected to Redis for caching.")
        except redis.exceptions.ConnectionError as e:
            print(f"LLM Provider: Redis connection failed: {e}. Caching will be disabled.")
            redis_client = None
    return redis_client


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 3600):
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl  # Time-to-live in seconds
        if self.cache_enabled:
            self.redis_client = get_redis_client()
        else:
            self.redis_client = None

    def _generate_cache_key(self, prompt: str, **kwargs) -> str:
        """Generates a consistent cache key from prompt and kwargs."""
        key_data = {"prompt": prompt, "kwargs": kwargs}
        return (
            "llm_cache:"
            + hashlib.md5(json.dumps(key_data, sort_keys=True).encode("utf-8")).hexdigest()
        )

    @abstractmethod
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generates text based on the given prompt."""
        pass

    async def _cached_generate_text(self, prompt: str, **kwargs) -> str:
        """Generates text with caching."""
        if not self.cache_enabled or not self.redis_client:
            return await self.generate_text(prompt, **kwargs)

        cache_key = self._generate_cache_key(prompt, **kwargs)
        cached_response = self.redis_client.get(cache_key)

        if cached_response:
            print(f"LLM Provider: Cache hit for key: {cache_key}")
            return cached_response.decode("utf-8")
        else:
            print(f"LLM Provider: Cache miss for key: {cache_key}")
            response = await self.generate_text(prompt, **kwargs)
            self.redis_client.setex(cache_key, self.cache_ttl, response.encode("utf-8"))
            return response


class MockLLMProvider(LLMProvider):
    """A mock LLM provider for simulation purposes."""

    async def generate_text(self, prompt: str, **kwargs) -> str:
        # WAR-GAMED SIMULATION - This is a mock implementation.
        # In a real scenario, this would call an actual LLM API.
        print(f"MockLLMProvider: Generating text for prompt (first 100 chars): {prompt[:100]}...")
        if "estimate intent" in prompt.lower():
            return json.dumps(
                {
                    "estimated_intent": "High likelihood of disinformation escalation (Mock LLM)",
                    "likelihood": 0.8 + (hash(prompt) % 20) / 100.0,  # Vary likelihood slightly
                    "reasoning": f"Mock reasoning based on prompt: '{prompt}'. (Simulated LLM output)",
                }
            )
        elif "generate playbook" in prompt.lower():
            return json.dumps(
                {
                    "name": "Simulated Counter-Narrative Playbook",
                    "doctrine_reference": "JP 3-13 (Mock LLM)",
                    "description": f"A mock playbook generated for: {prompt}. (Simulated LLM output)",
                    "steps": ["Mock Step 1", "Mock Step 2", "Mock Step 3"],
                    "metrics_of_effectiveness": ["Mock MOE 1"],
                    "metrics_of_performance": ["Mock MOP 1"],
                }
            )
        else:
            return f"Mock LLM response for: {prompt}"


# Global instance of the LLM provider
llm_provider: LLMProvider = MockLLMProvider(cache_enabled=True)
