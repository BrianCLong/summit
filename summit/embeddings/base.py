from abc import ABC, abstractmethod
from typing import List


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_text(self, text: str) -> list[float]: pass
    @abstractmethod
    def get_fingerprint(self) -> str: pass
