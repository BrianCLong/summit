from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class BaseAgent:
    name: str
    version: str = "0.1.0"

    def run(self, task: str, context: dict[str, str]) -> dict[str, str]:
        raise NotImplementedError
