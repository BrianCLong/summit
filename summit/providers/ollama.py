from __future__ import annotations

import hashlib
import json
import time
from typing import Any

import requests


class OllamaProvider:
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        timeout_s: float = 60.0,
        max_retries: int = 2,
        retry_backoff_s: float = 0.25,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self.max_retries = max_retries
        self.retry_backoff_s = retry_backoff_s

    def health(self) -> dict[str, Any]:
        response = requests.get(self.base_url, timeout=self.timeout_s)
        response.raise_for_status()
        return {
            "ok": True,
            "status_code": response.status_code,
            "body": response.text.strip(),
        }

    def generate(self, model: str, prompt: str, *, options: dict | None = None) -> dict:
        payload = {"model": model, "prompt": prompt}
        if options:
            payload["options"] = options

        # NOTE: Ollama streams by default, use stream=False to get a single JSON response
        payload["stream"] = False

        attempts = self.max_retries + 1
        for attempt in range(attempts):
            try:
                response = requests.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=self.timeout_s,
                )
                response.raise_for_status()
                data = response.json()
                break
            except requests.RequestException:
                if attempt >= self.max_retries:
                    raise
                time.sleep(self.retry_backoff_s * (2**attempt))

        # Stable digest for evidence linkage
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return {"response": data.get("response", ""), "request_digest": digest}
