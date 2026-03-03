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
        self._client: Optional[httpx.Client] = None
        self._async_client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.Client:
        if self._client is None:
            self._client = httpx.Client(timeout=60.0)
        return self._client

    def _get_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(timeout=60.0)
        return self._async_client

    def generate(self, prompt: str, **kwargs: Any) -> ModelOutput:
        """
        Synchronous generation for Qwen3.5 Medium.
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

        response = self._get_client().post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload
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

        response = await self._get_async_client().post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()

        return ModelOutput(
            text=data["choices"][0]["message"]["content"],
            raw_response=data,
            usage=data.get("usage", {}),
            metadata={"model": self.MODEL_ID}
        )

    def close(self):
        """Explicitly close the clients."""
        if self._client:
            self._client.close()
            self._client = None
        # Note: async_client close should be awaited, but we provide a sync close for the sync client.

    async def aclose(self):
        """Asynchronously close the clients."""
        if self._client:
            self._client.close()
            self._client = None
        if self._async_client:
            await self._async_client.aclose()
            self._async_client = None
