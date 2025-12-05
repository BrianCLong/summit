from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List


@dataclass
class Scenario:
    description: str
    depth: int


class ScenarioGenerator:
    """Produces curated simulation scenarios for orchestrators."""

    def __init__(self) -> None:
        self.catalog: List[Scenario] = [
            Scenario("Jules executes next", depth=2),
            Scenario("Codex proposes refactor", depth=2),
            Scenario("Architecture migration initiated", depth=3),
            Scenario("PII governance updated", depth=1),
            Scenario("Security rule tightens", depth=1),
        ]

    def scenarios(self) -> Iterable[Scenario]:
        return tuple(self.catalog)
