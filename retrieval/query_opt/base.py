from abc import ABC, abstractmethod
from typing import List

class BaseQueryOptimizer(ABC):
    @abstractmethod
    def optimize(self, query: str) -> List[str]:
        """
        Rewrites or expands the original query into a list of optimized queries.
        """
        pass
