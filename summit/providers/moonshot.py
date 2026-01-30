import os
from typing import Any, Dict, List, Optional

import httpx


class MoonshotProvider:
    """
    Provider for Moonshot AI Kimi K2.5 model via OpenAI-compatible API.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://api.moonshot.cn/v1"):
        self.api_key = api_key or os.environ.get("MOONSHOT_API_KEY")
        self.base_url = base_url.rstrip("/")
        if not self.api_key:
            # We don't raise here to allow instantiation if key is set later or for testing
            pass

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: Optional[list[dict[str, Any]]] = None,
        model: str = "moonshotai/Kimi-K2.5",
        temperature: float = 0.7
    ) -> dict[str, Any]:
        """
        Sends a chat completion request.
        """
        if not self.api_key:
             raise ValueError("MOONSHOT_API_KEY is not set")

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
