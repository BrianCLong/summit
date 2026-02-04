import re
import math
from typing import Dict, Any, List

# Common boilerplate phrases and "AI-isms" found in low-quality AI content
BOILERPLATE_PHRASES = [
    "as an ai language model",
    "it is important to note that",
    "in conclusion",
    "this highlights the importance of",
    "furthermore",
    "moreover",
    "lastly",
    "a testament to",
    "delve into",
    "the intricate tapestry",
    "shiver down the spine",
    "not just a... but a...",
    "in today's digital landscape",
    "unlocked new possibilities",
    "a beacon of hope",
]

def calculate_shannon_entropy(text: str) -> float:
    """Calculates the Shannon entropy of the character distribution."""
    if not text:
        return 0.0
    prob = [float(text.count(c)) / len(text) for c in set(text)]
    entropy = - sum([p * math.log2(p) for p in prob])
    return entropy

def calculate_repetition_score(text: str) -> float:
    """Simple heuristic for word/phrase repetition."""
    words = re.findall(r'\w+', text.lower())
    if not words:
        return 0.0
    unique_words = set(words)
    return 1.0 - (len(unique_words) / len(words))

def calculate_boilerplate_score(text: str) -> float:
    """Scores based on frequency of known boilerplate phrases."""
    text_lower = text.lower()
    matches = 0
    for phrase in BOILERPLATE_PHRASES:
        matches += len(re.findall(re.escape(phrase), text_lower))

    words_count = len(text_lower.split())
    if words_count == 0:
        return 0.0
    # Weighted matches to detect dense slop
    return min(1.0, (matches * 15) / words_count)

def get_slop_score(text: str) -> Dict[str, Any]:
    """Combines heuristics into a sophisticated slop score."""
    if not text:
        return {"score": 0.0, "reasons": ["EMPTY_CONTENT"], "metrics": {}}

    rep_score = calculate_repetition_score(text)
    bp_score = calculate_boilerplate_score(text)
    entropy = calculate_shannon_entropy(text)

    # Entropy normalization (English typically 4.0-5.0)
    # Very low entropy often means repetitive/automated text
    entropy_score = max(0.0, (4.0 - entropy) / 4.0) if entropy < 4.0 else 0.0

    # Combined weighted score
    # Higher weights on boilerplate and entropy for "AI-ness"
    total_score = (rep_score * 0.3) + (bp_score * 0.5) + (entropy_score * 0.2)

    reasons = []
    if rep_score > 0.5:
        reasons.append(f"HIGH_REPETITION: {rep_score:.2f}")
    if bp_score > 0.2:
        reasons.append(f"HIGH_BOILERPLATE: {bp_score:.2f}")
    if entropy < 3.5:
        reasons.append(f"LOW_ENTROPY: {entropy:.2f}")

    return {
        "score": total_score,
        "reasons": reasons,
        "metrics": {
            "repetition": round(rep_score, 4),
            "boilerplate": round(bp_score, 4),
            "entropy": round(entropy, 4),
            "entropy_score": round(entropy_score, 4)
        }
    }
