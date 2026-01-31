from typing import List, Callable, Any
from summit.input.types import IntentFrame

class IntentRouter:
    def __init__(self):
        self._subscribers: List[Callable[[IntentFrame], Any]] = []

    def subscribe(self, callback: Callable[[IntentFrame], Any]):
        self._subscribers.append(callback)

    def route(self, frame: IntentFrame):
        for sub in self._subscribers:
            sub(frame)
