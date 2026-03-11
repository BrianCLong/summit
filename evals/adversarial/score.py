import re
from typing import Any, Dict

def score_narrative_risk(text: str) -> Dict[str, Any]:
    """
    Scores narrative risk based on heuristics.
    This serves as a mock for the production scoring pipeline.
    """
    text_lower = text.lower()

    # 1. Detection heuristics (simulating content detection)
    risk_keywords = [
        "synthetic_risk_pattern_alpha",
        "synthetic_risk_pattern_beta",
        "confidential_leak_sim",
        "unauthorized_access_sim",
        "ignore previous instructions", # Prompt injection
        "system prompt",
        "bypassing"
    ]

    detected_patterns = [k for k in risk_keywords if k in text_lower]

    # Check for obfuscation (e.g., s_y_n_t_h_e_t_i_c)
    obfuscated_alpha = bool(re.search(r"s[^a-z0-9]*y[^a-z0-9]*n[^a-z0-9]*t[^a-z0-9]*h[^a-z0-9]*e[^a-z0-9]*t[^a-z0-9]*i[^a-z0-9]*c[^a-z0-9]*_[^a-z0-9]*r[^a-z0-9]*i[^a-z0-9]*s[^a-z0-9]*k", text_lower))
    if obfuscated_alpha:
        detected_patterns.append("obfuscated_risk_pattern")

    score = 0.0
    if detected_patterns:
        score += 0.5 + (0.1 * len(detected_patterns))

    # Cap score at 1.0
    score = min(score, 1.0)

    return {
        "risk_score": score,
        "patterns_detected": detected_patterns,
        "risk_category": "high" if score > 0.7 else "medium" if score > 0.3 else "low",
        "is_flagged": score > 0.5
    }
