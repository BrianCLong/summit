"""RewardHub converts KPI metrics into scalar rewards with provenance tracking."""

from __future__ import annotations

from collections.abc import Mapping, MutableMapping
from dataclasses import dataclass


@dataclass(slots=True)
class RewardDefinition:
    """Describes how a specific KPI bundle should be combined."""

    name: str
    kpi_weights: Mapping[str, float]
    clip: tuple[float, float] = (-10.0, 10.0)


@dataclass
class RewardObservation:
    """Detailed information generated for provenance logging."""

    reward: float
    components: dict[str, float]
    definition: RewardDefinition


class RewardHub:
    """Central registry for reward definitions and evaluation helpers."""

    def __init__(self, default_weights: Mapping[str, float]) -> None:
        self._definitions: MutableMapping[str, RewardDefinition] = {}
        self.register("default", default_weights)

    def register(self, name: str, kpi_weights: Mapping[str, float]) -> RewardDefinition:
        normalized = self._normalize(kpi_weights)
        definition = RewardDefinition(name=name, kpi_weights=normalized)
        self._definitions[name] = definition
        return definition

    def evaluate(self, name: str, metrics: Mapping[str, float]) -> RewardObservation:
        definition = self._definitions.get(name)
        if definition is None:
            raise KeyError(f"Unknown reward: {name}")

        components: dict[str, float] = {}
        score = 0.0
        for kpi, weight in definition.kpi_weights.items():
            value = float(metrics.get(kpi, 0.0))
            contribution = value * weight
            components[kpi] = contribution
            score += contribution

        lower, upper = definition.clip
        clamped = max(lower, min(upper, score))
        return RewardObservation(reward=clamped, components=components, definition=definition)

    def list_definitions(self) -> list[RewardDefinition]:
        return list(self._definitions.values())

    @staticmethod
    def _normalize(weights: Mapping[str, float]) -> dict[str, float]:
        if not weights:
            raise ValueError("At least one KPI weight must be provided")
        total = sum(abs(v) for v in weights.values())
        if total == 0:
            raise ValueError("KPI weights cannot all be zero")
        return {key: float(value) / total for key, value in weights.items()}
