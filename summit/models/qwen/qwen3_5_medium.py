from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

from summit.models.adapter import BaseModelAdapter, ModelOutput


class Qwen35MediumAdapter(BaseModelAdapter):
    """
    Adapter for Alibaba's Qwen3.5 Medium model.
    Performance is comparable to Claude Sonnet 4.5.
    """
    MODEL_ID = "qwen3.5-medium"

    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.aliyun.com/v1"):
        self.api_key = api_key or os.environ.get("QWEN_API_KEY")
        self.base_url = base_url.rstrip("/")

    def generate(self, prompt: str, **kwargs: Any) -> ModelOutput:
        """
        Synchronous generation for Qwen3.5 Medium.
        Note: This is a synchronous wrapper around the httpx call.
        """
        if not self.api_key:
            raise ValueError("QWEN_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.MODEL_ID,
            "messages": [{"role": "user", "content": prompt}],
            **kwargs
        }

        with httpx.Client() as client:
            response = client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()

            return ModelOutput(
                text=data["choices"][0]["message"]["content"],
                raw_response=data,
                usage=data.get("usage", {}),
                metadata={"model": self.MODEL_ID}
            )

    async def generate_async(self, prompt: str, **kwargs: Any) -> ModelOutput:
        """Asynchronous generation for Qwen3.5 Medium."""
        if not self.api_key:
            raise ValueError("QWEN_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.MODEL_ID,
            "messages": [{"role": "user", "content": prompt}],
            **kwargs
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()

            return ModelOutput(
                text=data["choices"][0]["message"]["content"],
                raw_response=data,
                usage=data.get("usage", {}),
                metadata={"model": self.MODEL_ID}
            )
