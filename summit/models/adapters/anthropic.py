from typing import List, Dict, Any, Optional
from .base import ModelAdapter

class AnthropicAdapter(ModelAdapter):
    def complete(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        # Stub implementation for MWS
        return {
            "content": "Simulated Anthropic response",
            "tool_calls": None
        }
