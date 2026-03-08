# summit/supplychain/canary/providers/http_probe.py
from typing import Any, Dict


class HttpProbe:
    def __init__(self, name: str, headers: dict[str, str] = None):
        self.name = name
        self.headers = headers or {}

    def probe(self, target_url: str) -> dict[str, Any]:
        # In a real implementation, this would make actual HTTP requests.
        # For this scaffold, we return a mock response that can be controlled in tests.
        return {
            "url": target_url,
            "headers": self.headers,
            # Mock artifact metadata
            "artifact_hash": "sha256:12345",
            "content_length": 1000
        }
