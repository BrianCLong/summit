from abc import ABC, abstractmethod
from typing import List, Any, Dict

class BaseChunker(ABC):
    @abstractmethod
    def chunk(self, content: Any, **kwargs) -> List[Dict[str, Any]]:
        """
        Splits content into chunks.
        Returns a list of dictionaries representing chunks.
        """
        pass
