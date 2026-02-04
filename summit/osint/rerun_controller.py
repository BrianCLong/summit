from typing import List, Dict, Any
from datetime import datetime, timezone
from summit.osint.assumptions import AssumptionRegistry

class RerunController:
    """
    Orchestrates reruns based on assumption invalidation.
    """
    def __init__(self, registry: AssumptionRegistry):
        self.registry = registry

    def check_and_trigger(self) -> Dict[str, Any]:
        """
        Check assumptions and generate a rerun stamp if any are invalid.
        """
        invalidated = self.registry.verify_all()

        if invalidated:
            # Generate deterministic-looking ID (in real app, use input hash)
            run_id = f"RERUN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

            return {
                "triggered": True,
                "stamp": {
                    "run_id": run_id,
                    "trigger_event": "assumption_invalidation",
                    "invalidated_assumptions": invalidated,
                    "deterministic_timestamp": datetime.now(timezone.utc).isoformat()
                }
            }

        return {"triggered": False}
