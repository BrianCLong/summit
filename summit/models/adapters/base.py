from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class ModelAdapter(ABC):
    @abstractmethod
    def complete(self, messages: list[dict[str, str]], tools: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
        """
        Execute completion request.
        Returns normalized response:
        {
            "content": str,
            "tool_calls": List[Dict] | None
        }
        """
        pass
