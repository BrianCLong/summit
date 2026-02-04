import os
from typing import Any, Iterable

from ..signals.base import Event


def is_enabled():
    return os.getenv("INTEGRITY_SIM_HARNESS_ENABLED", "false").lower() == "true"

class DatasetAdapter:
    """
    Adapter interface for synthetic/simulated datasets.
    """
    def load_events(self, source: str) -> Iterable[Event]:
        if not is_enabled():
            return []
        raise NotImplementedError("load_events must be implemented by concrete adapters")
