from datetime import UTC, datetime, timezone
from typing import Any, Callable, Dict, List, Optional


class AssumptionRegistry:
    """
    Registry for tracking analysis assumptions and verifying their validity.
    """
    def __init__(self):
        self.assumptions: dict[str, dict[str, Any]] = {}

    def register(self, id: str, statement: str, validity_condition: Callable[[], bool]):
        """
        Register a new assumption with a validation callback.
        """
        self.assumptions[id] = {
            "id": id,
            "statement": statement,
            "validity_condition": validity_condition,
            "last_verified": datetime.now(UTC).isoformat(),
            "is_valid": True
        }

    def verify_all(self) -> list[str]:
        """
        Verify all assumptions. Return list of invalidated assumption IDs.
        """
        invalidated = []
        for id, data in self.assumptions.items():
            is_valid = False
            try:
                if data["validity_condition"]:
                    is_valid = data["validity_condition"]()
                else:
                    is_valid = True # No condition means always valid? Or manual?
            except Exception:
                is_valid = False

            data["last_verified"] = datetime.now(UTC).isoformat()
            data["is_valid"] = is_valid

            if not is_valid:
                invalidated.append(id)

        return invalidated

    def export(self) -> list[dict[str, Any]]:
        """
        Export the registry artifacts conforming to assumptions.schema.json
        """
        return [
            {
                "id": data["id"],
                "statement": data["statement"],
                "validity_condition": str(data["validity_condition"]),
                "last_verified": data["last_verified"]
            }
            for data in self.assumptions.values()
        ]

    def get_assumption(self, id: str) -> Optional[dict[str, Any]]:
        return self.assumptions.get(id)
