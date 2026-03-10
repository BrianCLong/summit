import time
from models.base import BaseModelAdapter, ModelOutput
from typing import Dict, Any

class Sonnet45Adapter(BaseModelAdapter):
    MODEL_ID = "sonnet-4.5"

    def generate(self, prompt: str, **kwargs) -> ModelOutput:
        """
        Simulates generation from Claude Sonnet 4.5.
        """
        start_time = time.time()

        # Simulate processing time
        time.sleep(0.12)

        # Deterministic mock response based on prompt content
        if "fibonacci" in prompt.lower():
            response = "def fibonacci(n):\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)"
        elif "prime" in prompt.lower():
            response = "def is_prime(n):\n    if n < 2: return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0: return False\n    return True"
        else:
            response = "I am Claude Sonnet 4.5, a model from Anthropic."

        latency = (time.time() - start_time) * 1000

        return ModelOutput(
            text=response,
            tokens_used=len(response.split()),
            latency_ms=latency,
            metadata={
                "model": self.MODEL_ID,
                "provider": "anthropic"
            }
        )
