from __future__ import annotations

from typing import Dict, Optional

from .models import InterventionResult, Simulation


class SimulationStore:
    def __init__(self) -> None:
        self._sims: Dict[str, Simulation] = {}
        self._interventions: Dict[str, InterventionResult] = {}

    def put(self, simulation: Simulation) -> None:
        self._sims[simulation.sim_id] = simulation

    def get(self, sim_id: str) -> Optional[Simulation]:
        return self._sims.get(sim_id)

    def record_intervention(self, result: InterventionResult) -> None:
        self._interventions[result.sim_id] = result

    def get_last_intervention(self, sim_id: str) -> Optional[InterventionResult]:
        return self._interventions.get(sim_id)


def get_store() -> SimulationStore:
    if not hasattr(get_store, "_instance"):
        get_store._instance = SimulationStore()  # type: ignore[attr-defined]
    return get_store._instance  # type: ignore[attr-defined]
