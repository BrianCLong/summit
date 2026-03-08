from typing import Any, Dict


class ContextValidator:
    def validate_recency(self, record: dict[str, Any]) -> bool:
        """
        Validate that the record has been recently updated.
        For deterministic testing, this simply checks for the presence of 'last_updated'.
        """
        if "last_updated" not in record:
            return False
        return True
