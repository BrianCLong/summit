from typing import Any, Dict


class MicrotargetingDetector:
    def detect(self, text: str) -> dict[str, Any]:
        text_lower = text.lower()
        micro_keywords = ["traits", "psychographic", "demographic", "personality", "persuade them to"]
        profiling_keywords = ["segment", "cluster", "fingerprint", "profile", "fears"]

        micro_hit = any(k in text_lower for k in micro_keywords)
        profiling_hit = any(k in text_lower for k in profiling_keywords)

        return {
            "microtargeting_intent": micro_hit,
            "profiling_intent": profiling_hit,
            "risk_score": 0.9 if (micro_hit or profiling_hit) else 0.0
        }
