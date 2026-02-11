from typing import List, Dict, Any
from collections import OrderedDict

class ConciergeRouter:
    def __init__(self, capacity: int = 4):
        self.registry = {}
        self.capacity = capacity
        self.active_specialists = OrderedDict()

    def register_specialist(self, name: str, capability: str):
        self.registry[name] = capability

    def hire_specialist(self, name: str) -> str:
        if name not in self.registry:
            raise ValueError(f"Specialist {name} not found in registry")

        if name in self.active_specialists:
            self.active_specialists.move_to_end(name)
        else:
            if len(self.active_specialists) >= self.capacity:
                # LRU Eviction
                self.active_specialists.popitem(last=False)
            self.active_specialists[name] = self.registry[name]

        return self.registry[name]

    def get_active_specialists(self) -> List[str]:
        return list(self.active_specialists.keys())
