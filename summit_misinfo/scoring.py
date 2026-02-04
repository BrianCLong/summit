from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Callable, List

from .signals import StreamEvent


@dataclass(frozen=True)
class Score:
    risk_score: float
    reasons: list[str]
    evd_ids: list[str]

Detector = Callable[[StreamEvent], Score]

class Registry:
    def __init__(self) -> None:
        self._detectors: list[Detector] = []

    def register(self, d: Detector) -> None:
        self._detectors.append(d)

    def score(self, e: StreamEvent) -> list[Score]:
        if os.environ.get("MISINFO_DEFENSE_ENABLED", "1") == "0":
            return []
        return [d(e) for d in self._detectors]
