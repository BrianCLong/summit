from .intent import Intent


class PolicyDecision:
    def __init__(self, allowed: bool, reason: str):
        self.allowed = allowed
        self.reason = reason

def evaluate_request(intent: Intent, context: dict = None) -> PolicyDecision:
    if intent in [Intent.OFFENSIVE_INFLUENCE, Intent.OFFENSIVE_SUPPORT]:
        return PolicyDecision(False, "Refusal: Offensive influence or support operations are strictly prohibited.")

    if intent in [Intent.DEFENSIVE_IW, Intent.RESILIENCE_DRILL, Intent.ACADEMIC_RESEARCH]:
        return PolicyDecision(True, "Approved: Request aligns with defensive, resilience, or research mission.")

    return PolicyDecision(False, "Refusal: Intent is unknown or unclassified.")

def classify_intent(text: str) -> Intent:
    # Simple keyword based classification for now (deterministic)
    lower_text = text.lower()

    offensive_keywords = [
        "generate propaganda",
        "create persuasion campaign",
        "microtarget",
        "manipulate population",
        "seed discord",
        "influence operation",
        "persuasion plan"
    ]

    defensive_keywords = [
        "detect indicators",
        "generate warning",
        "summarize anomalies",
        "resilience drill",
        "check metrics",
        "countermeasure",
        "indicators of coordinated narrative"
    ]

    for kw in offensive_keywords:
        if kw in lower_text:
            return Intent.OFFENSIVE_INFLUENCE

    for kw in defensive_keywords:
        if kw in lower_text:
            return Intent.DEFENSIVE_IW

    return Intent.UNKNOWN
