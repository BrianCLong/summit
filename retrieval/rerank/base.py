from abc import ABC, abstractmethod
from typing import List
from retrieval.types import Candidate

class BaseReranker(ABC):
    @abstractmethod
    def rerank(self, query: str, candidates: List[Candidate]) -> List[Candidate]:
        """
        Reranks a list of candidates based on the query.
        """
        pass
