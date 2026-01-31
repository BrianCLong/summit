from abc import ABC, abstractmethod
from typing import List
from summit.input.types import IntentFrame

class InputProvider(ABC):
    @abstractmethod
    def poll(self) -> List[IntentFrame]:
        """Fetch next batch of intent frames from sensor/stream."""
        pass
