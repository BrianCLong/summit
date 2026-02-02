import re
from typing import Dict, List, Any

def score_artifact(text: str) -> Dict[str, Any]:
    """
    Computes a slop score based on v0 heuristics.
    Returns: {"score": float, "reasons": List[str]}
    """
    score = 0.0
    reasons = []

    # 1. Repetition detection
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    if len(sentences) > 0:
        unique_sentences = set(sentences)
        repetition_ratio = 1.0 - (len(unique_sentences) / len(sentences))
        if repetition_ratio > 0.2:
            score += 0.4
            reasons.append(f"high_repetition_ratio:{repetition_ratio:.2f}")

    # 2. Boilerplate / Template markers
    boilerplate_patterns = [
        r"as an AI language model",
        r"in conclusion,",
        r"it is important to note",
        r"delve into",
        r"tapestry of",
        r"testament to",
        r"comprehensive review"
    ]
    matches = []
    for pattern in boilerplate_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            matches.append(pattern)

    if matches:
        score += 0.1 * len(matches)
        reasons.append(f"boilerplate_detected:{','.join(matches)}")

    # 3. Structural anomalies
    if len(text) < 50:
        score += 0.5
        reasons.append("artifact_too_short")

    # Cap score at 1.0
    final_score = min(1.0, score)
    return {"score": final_score, "reasons": reasons}
