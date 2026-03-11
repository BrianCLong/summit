import re
from typing import Any, Dict, List, Optional
from summit.influence.patterns.base import NarrativePattern, PatternMatch

class CoordinatedDelegitimizationPattern(NarrativePattern):
    pattern_id: str = "coordinated_delegitimization"
    description: str = "Detects coordinated attempts to delegitimize critical infrastructure or institutions."
    keywords: List[str] = ["rigged", "corrupt", "fake", "stolen", "sabotage"]
    threshold: float = 0.7

    def match(self, data: Dict[str, Any]) -> Optional[PatternMatch]:
        text = data.get("text", "").lower()
        matched_keywords = [k for k in self.keywords if k in text]

        # Heuristic score based on keyword density and coordination signals
        base_score = len(matched_keywords) / len(self.keywords)
        coordination_score = data.get("coordination_score", 0.0)

        final_score = (base_score * 0.4) + (coordination_score * 0.6)

        if final_score >= self.threshold:
            return PatternMatch(
                pattern_id=self.pattern_id,
                score=final_score,
                evidence={"matched_keywords": matched_keywords, "coordination_score": coordination_score},
                matched_elements=matched_keywords
            )
        return None

class PatternLibrary:
    def __init__(self):
        self.patterns: Dict[str, NarrativePattern] = {}

    def register_pattern(self, pattern: NarrativePattern):
        self.patterns[pattern.pattern_id] = pattern

    def scan(self, data: Dict[str, Any]) -> List[PatternMatch]:
        matches = []
        for pattern in self.patterns.values():
            match = pattern.match(data)
            if match:
                matches.append(match)
        return matches
