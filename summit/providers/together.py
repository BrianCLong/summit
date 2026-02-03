import os
from typing import Any, Dict, List, Optional

import httpx


class TogetherProvider:
    """
    Provider for Together AI hosting of Kimi K2.5.
    Guarded by FEATURE_TOGETHER_KIMI.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.together.xyz/v1"):
        # Inline feature flag check
        val = os.environ.get("FEATURE_TOGETHER_KIMI")
        enabled = val is not None and val.lower() in ("1", "true", "yes", "on")

        if not enabled:
             raise RuntimeError("Together provider is currently disabled. Set FEATURE_TOGETHER_KIMI=1 to enable.")

        self.api_key = api_key or os.environ.get("TOGETHER_API_KEY")
        self.base_url = base_url.rstrip("/")

        if not self.api_key:
            pass

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        model: str = "moonshotai/Kimi-K2.5",
        temperature: float = 0.7
    ) -> dict[str, Any]:

        if not self.api_key:
             raise ValueError("TOGETHER_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            return response.json()
