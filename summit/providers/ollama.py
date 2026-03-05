from __future__ import annotations

import hashlib
import json
import typing

import requests


class OllamaProvider:
    def __init__(self, base_url: str = "http://localhost:11434", timeout_s: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def generate(self, model: str, prompt: str, *, options: dict | None = None) -> dict:
        payload = {"model": model, "prompt": prompt}
        if options:
            payload["options"] = options

        # NOTE: Ollama streams by default, use stream=False to get a single JSON response
        payload["stream"] = False

        r = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=self.timeout_s)
        r.raise_for_status()
        data = r.json()

        # Stable digest for evidence linkage
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return {"response": data.get("response", ""), "request_digest": digest}
