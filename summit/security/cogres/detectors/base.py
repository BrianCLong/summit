from typing import Dict, Any

class Detector:
    def check(self, content: str) -> Dict[str, Any]:
        """
        Analyze content and return risk signals.
        Default implementation returns empty dict (Lane 2 OFF).
        """
        return {}
