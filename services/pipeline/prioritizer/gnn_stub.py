from typing import Any, Dict, Tuple

from packages.common.decision_record import DecisionRecord
from services.pipeline.prioritizer.base import Prioritizer


class GNNPrioritizerStub(Prioritizer):
    def prioritize(self, item_context: dict[str, Any]) -> tuple[float, DecisionRecord]:
        # GNN logic is stubbed out here.
        # Safe fallback: return neutral score with explicit explanation.

        score = 0.5
        factors = ["gnn_stub_active", "fallback_logic"]
        outcome = "standard"

        dr = DecisionRecord.create(
            context=str(item_context.get("id", "unknown")),
            outcome=outcome,
            factors=factors,
            policies=[],
            model="gnn-stub-v1"
        )
        return score, dr
