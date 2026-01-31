import re
from typing import Any, Dict


class CampaignDetector:
    def detect(self, text: str) -> dict[str, Any]:
        text_lower = text.lower()
        campaign_keywords = ["variants", "versions", "a/b test", "optimize for", "audiences"]

        # Check for numbers + variants
        # e.g. "200 variants"
        variant_pattern = re.search(r'\d+\s+variants', text_lower)

        campaign_hit = any(k in text_lower for k in campaign_keywords) or bool(variant_pattern)

        return {
            "campaign_mode": campaign_hit,
            "risk_score": 0.8 if campaign_hit else 0.0
        }
