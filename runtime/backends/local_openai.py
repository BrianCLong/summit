import requests
import json
import hashlib
import time
from urllib.parse import urljoin

class LocalOpenAIBackend:
    def __init__(self, base_url="http://127.0.0.1:1234/v1/", model="local-model"):
        self.base_url = base_url
        if not self.base_url.endswith("/"):
            self.base_url += "/"
        self.model = model

    def complete(self, prompt, temperature=0, max_tokens=1000, system_prompt="You are a helpful assistant."):
        """
        Sends a completion request to the local OpenAI-compatible endpoint.
        """
        url = urljoin(self.base_url, "chat/completions")
        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False
        }

        try:
            start_time = time.time()
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            end_time = time.time()

            response.raise_for_status()
            result = response.json()

            content = result['choices'][0]['message']['content']
            usage = result.get('usage', {})

            # Calculate simple hash for verification
            output_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()

            return {
                "content": content,
                "usage": usage,
                "latency_ms": (end_time - start_time) * 1000,
                "output_hash": output_hash,
                "model": self.model
            }

        except requests.exceptions.RequestException as e:
            # In a real scenario, we might want to retry or fallback
            # For now, we return a structured error
            return {
                "error": str(e),
                "content": None
            }
