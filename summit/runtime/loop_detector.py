from collections import deque
from typing import Any


class LoopDetector:
    def __init__(self, history_size: int = 5):
        self.history = deque(maxlen=history_size)

    def update(self, action_signature: Any) -> bool:
        """Returns True if loop detected."""
        # Simple check: if identical action happened 3 times recently (count >= 2 because we append after?)
        # Wait, if I append after, check before.
        # If it's already in history 2 times, adding it makes 3.
        if self.history.count(action_signature) >= 2:
             return True
        self.history.append(action_signature)
        return False
