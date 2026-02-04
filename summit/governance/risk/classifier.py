import yaml
import os
from pathlib import Path
from typing import Dict, Any

class RiskClassifier:
    def __init__(self, config_path: str = None):
        if config_path is None:
            # Default to bundled config
            config_path = str(Path(__file__).parent / "tiers.yaml")

        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

    def classify(self, agent_metadata: Dict[str, Any]) -> str:
        """
        Determines the risk tier based on metadata.
        Simple logic for now: check 'sensitivity' or 'capabilities'.
        """
        sensitivity = agent_metadata.get("sensitivity", "low")
        capabilities = agent_metadata.get("capabilities", [])

        if "external_email" in capabilities or "delete_data" in capabilities:
            return "high"

        if sensitivity == "high":
            return "high"

        if sensitivity == "medium":
            return "medium"

        return "low"

    def get_controls(self, tier: str) -> Dict[str, Any]:
        return self.config["levels"].get(tier, self.config["levels"]["high"]) # Fallback to high
