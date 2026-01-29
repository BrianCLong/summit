from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from packages.common.decision_record import DecisionRecord

class Prioritizer(ABC):
    @abstractmethod
    def prioritize(self, item_context: Dict[str, Any]) -> Tuple[float, DecisionRecord]:
        """
        Returns (priority_score, decision_record)
        """
        pass
