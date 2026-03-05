import time
from models.base import BaseModelAdapter, ModelOutput
from typing import Dict, Any

class Qwen35MediumAdapter(BaseModelAdapter):
    MODEL_ID = "qwen3.5-medium"

    def generate(self, prompt: str, **kwargs) -> ModelOutput:
        """
        Simulates generation from Qwen 3.5 Medium.
        """
        start_time = time.time()

        # Simulate processing time
        time.sleep(0.1)

        # Deterministic mock response based on prompt content
        if "fibonacci" in prompt.lower():
            response = "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)"
        elif "prime" in prompt.lower():
            response = "def is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True"
        else:
            response = "I am Qwen 3.5 Medium, an open model from Alibaba."

        latency = (time.time() - start_time) * 1000

        return ModelOutput(
            text=response,
            tokens_used=len(response.split()),
            latency_ms=latency,
            metadata={
                "model": self.MODEL_ID,
                "provider": "alibaba-opensource"
            }
        )
