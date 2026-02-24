from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class ModelAdapter(ABC):
    @abstractmethod
    def complete(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Execute completion request.
        Returns normalized response:
        {
            "content": str,
            "tool_calls": List[Dict] | None
        }
        """
        pass
