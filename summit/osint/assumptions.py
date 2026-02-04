from typing import List, Dict, Any, Callable, Optional
from datetime import datetime, timezone

class AssumptionRegistry:
    """
    Registry for tracking analysis assumptions and verifying their validity.
    """
    def __init__(self):
        self.assumptions: Dict[str, Dict[str, Any]] = {}

    def register(self, id: str, statement: str, validity_condition: Callable[[], bool]):
        """
        Register a new assumption with a validation callback.
        """
        self.assumptions[id] = {
            "id": id,
            "statement": statement,
            "condition": validity_condition,
            "last_verified": datetime.now(timezone.utc).isoformat(),
            "is_valid": True
        }

    def verify_all(self) -> List[str]:
        """
        Verify all assumptions. Return list of invalidated assumption IDs.
        """
        invalidated = []
        for id, data in self.assumptions.items():
            is_valid = False
            try:
                if data["condition"]:
                    is_valid = data["condition"]()
                else:
                    is_valid = True # No condition means always valid? Or manual?
            except Exception:
                is_valid = False

            data["last_verified"] = datetime.now(timezone.utc).isoformat()
            data["is_valid"] = is_valid

            if not is_valid:
                invalidated.append(id)

        return invalidated

    def get_assumption(self, id: str) -> Optional[Dict[str, Any]]:
        return self.assumptions.get(id)
