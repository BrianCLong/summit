from abc import ABC, abstractmethod
from typing import List
class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_text(self, text: str) -> List[float]: pass
    @abstractmethod
    def get_fingerprint(self) -> str: pass
