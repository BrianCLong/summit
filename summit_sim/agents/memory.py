from abc import ABC, abstractmethod
from typing import List, Any

class Memory(ABC):
    @abstractmethod
    def store(self, item: Any) -> None:
        pass

    @abstractmethod
    def retrieve(self, query: Any) -> List[Any]:
        pass

class NoOpMemory(Memory):
    def store(self, item: Any) -> None:
        pass

    def retrieve(self, query: Any) -> List[Any]:
        return []
