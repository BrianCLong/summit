from typing import Any, Dict, List, Optional

from .base import ModelAdapter


class AnthropicAdapter(ModelAdapter):
    def complete(self, messages: list[dict[str, str]], tools: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
        # Stub implementation for MWS
        return {
            "content": "Simulated Anthropic response",
            "tool_calls": None
        }
