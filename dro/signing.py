"""Plan signing utilities."""

from __future__ import annotations

import hmac
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict

from .models import OptimizationResult


@dataclass(slots=True)
class PlanSigner:
    """Produces and verifies signed plans."""

    secret: str
    algorithm: str = "HS256"

    def build_payload(self, result: OptimizationResult) -> Dict[str, Any]:
        placements = result.sorted_placements()
        deterministic_source = json.dumps(
            {"placements": placements, "inputs_digest": result.inputs_digest},
            sort_keys=True,
            separators=(",", ":"),
        )
        plan_hash = hashlib.sha256(deterministic_source.encode("utf-8")).hexdigest()
        payload = {
            "plan_id": plan_hash,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
            "objective_cost": round(result.objective_cost, 6),
            "solver_status": result.solver_status,
            "placements": placements,
            "inputs_digest": result.inputs_digest,
        }
        return payload

    def sign(self, result: OptimizationResult) -> Dict[str, Any]:
        payload = self.build_payload(result)
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        signature = hmac.new(
            self.secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        payload["signature"] = {"algorithm": self.algorithm, "value": signature}
        return payload

    def verify(self, plan: Dict[str, Any]) -> bool:
        expected = dict(plan)
        signature = expected.pop("signature", None)
        if not signature or "value" not in signature:
            return False
        canonical = json.dumps(expected, sort_keys=True, separators=(",", ":"))
        expected_value = hmac.new(
            self.secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_value, signature.get("value", ""))
