from datetime import UTC, datetime, timezone
from typing import Any, Dict, List

from summit.osint.assumptions import AssumptionRegistry


class RerunController:
    """
    Orchestrates reruns based on assumption invalidation.
    """
    def __init__(self, registry: AssumptionRegistry):
        self.registry = registry

    def check_and_trigger(self) -> dict[str, Any]:
        """
        Check assumptions and generate a rerun stamp if any are invalid.
        """
        invalidated = self.registry.verify_all()

        if invalidated:
            # Generate deterministic-looking ID (in real app, use input hash)
            run_id = f"RERUN-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"

            return {
                "triggered": True,
                "stamp": {
                    "run_id": run_id,
                    "trigger_event": "assumption_invalidation",
                    "invalidated_assumptions": invalidated,
                    "deterministic_timestamp": datetime.now(UTC).isoformat()
                }
            }

        return {"triggered": False}
