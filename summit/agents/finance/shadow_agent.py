from __future__ import annotations
from typing import Dict, List, Optional
from summit.flags import is_feature_enabled

class ShadowAgent:
    def __init__(self, name: str, allowed_tools: List[str]):
        self.name = name
        self.allowed_tools = allowed_tools
        self.enabled = is_feature_enabled("FINANCE_SHADOW_AGENT_ENABLED", default=False)

    def process(self, inputs: Dict) -> Dict:
        if not self.enabled:
            return {
                "action": "skip",
                "reason": "feature_flag_disabled",
                "recommendation": None
            }

        return {
            "action": "recommend",
            "recommendation": "approve_with_conditions",
            "rationale": "Score > 700"
        }
