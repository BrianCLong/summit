from abc import ABC, abstractmethod
from typing import Any, Dict


class Policy(ABC):
    @abstractmethod
    def decide(self, context: dict[str, Any]) -> Any:
        pass

class DeterministicPolicy(Policy):
    def decide(self, context: dict[str, Any]) -> Any:
        return "DEFAULT_ACTION"
