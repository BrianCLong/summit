import hashlib
import re
from typing import Dict, List, Optional
from summit.narrative.events import DetectorEvent

class AmbiguitySpikeDetector:
    def __init__(self):
        self.markers = [
            r"unclear", r"maybe", r"too early to tell",
            r"awaiting confirmation", r"reports are conflicting",
            r"situation is fluid", r"unknown"
        ]

    def score(self, texts: List[str]) -> float:
        if not texts:
            return 0.0

        count = 0
        total_texts = len(texts)
        for text in texts:
            text_lower = text.lower()
            for marker in self.markers:
                if re.search(marker, text_lower):
                    count += 1
                    break # Count per text

        return count / total_texts

    def detect(self, pre_event_texts: List[str], post_event_texts: List[str], event_window: Dict[str, str], evidence_ids: List[str]) -> Optional[DetectorEvent]:
        pre_score = self.score(pre_event_texts)
        post_score = self.score(post_event_texts)

        # Spike detection: significant increase
        if post_score > pre_score * 1.5 and post_score > 0.3:
            spike_magnitude = post_score - pre_score

            payload = f"{pre_score}|{post_score}|{event_window.get('start')}"
            event_id = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

            return DetectorEvent(
                event_id=event_id,
                detector="ambiguity_spike",
                score=spike_magnitude,
                threshold=0.3, # Arbitrary threshold for magnitude
                window=event_window,
                evidence_ids=evidence_ids,
                metadata={
                    "pre_score": str(pre_score),
                    "post_score": str(post_score),
                    "magnitude": str(spike_magnitude)
                }
            )
        return None

class PrebunkSlotReadiness:
    def __init__(self):
        self.templates = [
            r"hidden forces", r"global agenda", r"they don't want you to know"
        ]

    def check_readiness(self, texts: List[str]) -> float:
        # Measure presence of templates
        count = 0
        for text in texts:
             for tmpl in self.templates:
                 if re.search(tmpl, text.lower()):
                     count += 1
                     break
        return count / len(texts) if texts else 0.0
