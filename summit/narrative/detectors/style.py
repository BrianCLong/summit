import hashlib
import re
from typing import Dict, List, Optional
from summit.narrative.events import DetectorEvent

class LegibilityBorrowingStyleDrift:
    def __init__(self, history_check_enabled: bool = True):
        self.history_check_enabled = history_check_enabled
        self.styles = {
            "academic": [r"abstract", r"methodology", r"et al\.", r"p < 0\.05", r"study demonstrates"],
            "legal": [r"pursuant to", r"herein", r"aforementioned", r"statute", r"liability"],
            "policy": [r"executive order", r"regulatory framework", r"strategic implication", r"national security"],
        }

    def detect_style(self, text: str) -> str:
        text_lower = text.lower()
        scores = {style: 0 for style in self.styles}

        for style, patterns in self.styles.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    scores[style] += 1

        # Find max score
        best_style = max(scores, key=scores.get)
        if scores[best_style] > 0:
            return best_style
        return "casual"

    def detect(self, text: str, actor_id: str, historical_style: str, evidence_ids: List[str]) -> Optional[DetectorEvent]:
        current_style = self.detect_style(text)

        # Drift logic: if historical is "casual" and current is High Formality (academic/legal/policy)
        if historical_style == "casual" and current_style in self.styles:
            score = 1.0 # High drift
            threshold = 0.8

            payload = f"{actor_id}|{historical_style}|{current_style}|{text[:20]}"
            event_id = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

            return DetectorEvent(
                event_id=event_id,
                detector="style_drift",
                score=score,
                threshold=threshold,
                window={}, # Single point detection
                evidence_ids=evidence_ids,
                metadata={
                    "actor_id": actor_id,
                    "historical_style": historical_style,
                    "current_style": current_style
                }
            )
        return None
