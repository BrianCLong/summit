from abc import ABC, abstractmethod
from typing import List
from retrieval.types import Candidate, ContextPack

class BaseContextBuilder(ABC):
    @abstractmethod
    def build(self, candidates: List[Candidate], query: str) -> ContextPack:
        """
        Builds a final context pack from a list of candidates.
        """
        pass
