from abc import ABC, abstractmethod
from typing import Iterable

from summit.input.types import IntentFrame


class InputProvider(ABC):
    @abstractmethod
    def stream_intents(self) -> Iterable[IntentFrame]:
        raise NotImplementedError
