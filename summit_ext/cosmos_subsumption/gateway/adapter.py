from __future__ import annotations
from abc import ABC, abstractmethod
from ..policy.model import ExposureRule

class GatewayAdapter(ABC):
    @abstractmethod
    def apply_policy(self, rule: ExposureRule) -> None:
        """Apply the exposure rule to the gateway."""
        pass
