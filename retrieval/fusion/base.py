from abc import ABC, abstractmethod
from typing import List
from retrieval.types import Candidate

class BaseFuser(ABC):
    @abstractmethod
    def fuse(self, results: List[List[Candidate]]) -> List[Candidate]:
        """
        Fuses multiple lists of candidates into a single ranked list.
        """
        pass
