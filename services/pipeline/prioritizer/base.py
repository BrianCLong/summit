from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple

from packages.common.decision_record import DecisionRecord


class Prioritizer(ABC):
    @abstractmethod
    def prioritize(self, item_context: dict[str, Any]) -> tuple[float, DecisionRecord]:
        """
        Returns (priority_score, decision_record)
        """
        pass
