from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime, timezone

@dataclass
class RiskEntry:
    risk_id: str
    name: str
    attack_surface: str
    symptom_patterns: List[str]
    linked_mitigations: List[str]

class CounterAIRiskRegister:
    def __init__(self):
        self.risks = {
            "R-001": RiskEntry(
                risk_id="R-001",
                name="Corpus Poisoning",
                attack_surface="Ingestion Pipeline -> GraphRAG Index",
                symptom_patterns=["Sudden influx of documents with identical high-frequency keywords", "Unverified sources dominating specific narrative themes"],
                linked_mitigations=["Source reputation filtering (Planned)", "Anomaly detection on ingestion rate (Active)"]
            ),
            "R-002": RiskEntry(
                risk_id="R-002",
                name="Relation Injection / Enhancement",
                attack_surface="Graph Relation Creation",
                symptom_patterns=["Rapid creation of new edges between previously unconnected communities", "Spike in semantic similarity scores between targeted nodes"],
                linked_mitigations=["Rate-limiting edge creation per source (Active)", "Review by 'Defensive Analysis Only' Workbench (Planned)"]
            ),
            "R-003": RiskEntry(
                risk_id="R-003",
                name="Community Densification",
                attack_surface="GraphRAG Community Detection",
                symptom_patterns=["Artificial tight clustering of sockpuppet nodes to manipulate global summaries"],
                linked_mitigations=["Graph structural stability checks (Active)"]
            )
        }

    def get_risk(self, risk_id: str) -> Optional[RiskEntry]:
        return self.risks.get(risk_id)

    def get_all_risks(self) -> List[RiskEntry]:
        return list(self.risks.values())

@dataclass
class RiskObservation:
    risk_id: str
    target_ids: List[str]  # e.g., document IDs, node IDs, edge tuples
    context: str
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)

class RiskObservationBus:
    """A minimal, in-memory bus for collecting risk observations without blocking."""
    def __init__(self):
        self._observations: List[RiskObservation] = []

    def emit(self, observation: RiskObservation):
        self._observations.append(observation)

    def get_observations(self) -> List[RiskObservation]:
        return list(self._observations)

    def clear(self):
        self._observations.clear()

# Global bus instance for hooks to use
global_risk_bus = RiskObservationBus()
