from abc import ABC, abstractmethod
from typing import List
from retrieval.types import Candidate

class BaseRetriever(ABC):
    @abstractmethod
    def retrieve(self, query: str, limit: int) -> List[Candidate]:
        """
        Retrieves candidates for a given query.
        """
        pass
