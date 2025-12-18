from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd

from .config import get_settings
from .learners.granger import GrangerCausality, granger_confidence
from .learners.notears import NoteaRSRegression, noteas_confidence
from .learners.pc import PCAlgorithm, pc_confidence
from .models import Simulation, new_simulation_id
from .simulator import DoCalculusSimulator, compute_baseline
from .storage import SimulationStore


class CausalDiscoveryService:
    def __init__(self, store: SimulationStore) -> None:
        self.store = store
        self.settings = get_settings()
        self.learners = {
            "notears": (NoteaRSRegression(), noteas_confidence),
            "pc": (PCAlgorithm(), pc_confidence),
            "granger": (GrangerCausality(), granger_confidence),
        }

    def _load_data(self, records: List[Dict[str, float]]) -> pd.DataFrame:
        if not records:
            raise ValueError("records are required")
        df = pd.DataFrame(records)
        df = df.replace({"": np.nan}).dropna(axis=1, how="all")
        if df.empty:
            raise ValueError("records did not contain numeric data")
        return df

    def discover(
        self, records: List[Dict[str, float]], algorithm: Optional[str] = None
    ) -> Simulation:
        df = self._load_data(records)
        algo = (algorithm or self.settings.default_algorithm).lower()
        if algo not in self.learners:
            raise ValueError(f"Unsupported algorithm '{algo}'")
        learner, confidence_fn = self.learners[algo]
        graph = learner.fit(df)
        confidence = confidence_fn(graph)
        baseline = compute_baseline(df)
        sim = Simulation(
            sim_id=new_simulation_id(),
            graph=graph,
            baseline=baseline,
            confidence=confidence,
        )
        self.store.put(sim)
        return sim

    def intervene(
        self,
        sim_id: str,
        interventions: Dict[str, float],
        target: Optional[str],
    ) -> Tuple[Simulation, DoCalculusSimulator]:
        simulation = self.store.get(sim_id)
        if not simulation:
            raise KeyError(f"simulation {sim_id} not found")
        simulator = DoCalculusSimulator(simulation.graph, simulation.baseline)
        return simulation, simulator


__all__: Iterable[str] = ["CausalDiscoveryService"]
