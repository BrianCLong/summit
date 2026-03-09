from __future__ import annotations
from .adapter import GatewayAdapter
from ..policy.model import ExposureRule
from ..policy.eval import validate, PolicyError
from ..evidence.emit import emit

class ShadowGatewayAdapter(GatewayAdapter):
    def apply_policy(self, rule: ExposureRule) -> None:
        notes = []
        status = "success"
        try:
            validate(rule)
            notes.append(f"Policy validated for app: {rule.app_id}")
        except PolicyError as e:
            status = "rejected"
            notes.append(f"Policy rejected for app: {rule.app_id}: {str(e)}")

        # Emit evidence EVD-COSMOS-SERVER-GW-001
        emit(
            evidence_index={
                "EVD-COSMOS-SERVER-GW-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
            },
            report={"status": status, "notes": notes},
            metrics={"counters": {"policies_evaluated": 1}}
        )
