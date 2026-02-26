from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, List

from summit.protocols.envelope import SummitEnvelope

# Note: PolicyRule is a Protocol defined in summit.policy.engine, we don't need to inherit from it explicitly
# but we need to match the signature: check(self, env: SummitEnvelope) -> list[str]


def classify_repetition(text: str) -> dict[str, Any]:
    """
    Detects repeated sentences in the text.
    Returns a dictionary with classification details.
    """
    if not text:
        return {"class": "none", "score": 0, "details": []}

    # Split into sentences (naive split by .!? followed by whitespace)
    sentences = [s.strip().lower() for s in re.split(r'[.!?]+', text) if s.strip()]
    counts = Counter(sentences)

    repeated = {s: c for s, c in counts.items() if c > 1}

    if not repeated:
        return {"class": "none", "score": 0, "details": []}

    # Analyze repetitions
    harmful_score = 0
    beneficial_score = 0
    details = []

    for s, count in repeated.items():
        # Heuristic: Short, punchy repetitions are reinforcement (beneficial).
        # Long, verbose repetitions are redundancy (harmful).
        # Threshold: 200 characters is arbitrary but reasonable for a "command".
        if len(s) < 100:
            beneficial_score += len(s) * (count - 1)
            details.append({"type": "beneficial", "text": s[:50], "count": count})
        else:
            harmful_score += len(s) * (count - 1)
            details.append({"type": "harmful", "text": s[:50], "count": count})

    if harmful_score > beneficial_score:
        return {"class": "harmful", "score": harmful_score, "details": details}
    else:
        return {"class": "beneficial", "score": beneficial_score, "details": details}


class RepetitionPolicyRule:
    """
    Policy rule that flags harmful repetition in prompts.
    """
    def __init__(self, threshold: int = 500):
        self.threshold = threshold

    def check(self, env: SummitEnvelope) -> list[str]:
        # Check text content of the envelope
        # Assuming env.text contains the prompt or message
        if not env.text:
            return []

        result = classify_repetition(env.text)

        if result["class"] == "harmful" and result["score"] > self.threshold:
            return [f"harmful_repetition_detected:score={result['score']}"]

        return []
