from __future__ import annotations

from dataclasses import dataclass

from .intent import Intent


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str
    requires_human_review: bool = False


def evaluate_request(intent: Intent, context: dict | None = None) -> PolicyDecision:
    context = context or {}
    defense_mode = bool(context.get("defense_mode", True))
    requester_role = str(context.get("requester_role", "unknown")).lower()

    if intent in [Intent.OFFENSIVE_INFLUENCE, Intent.OFFENSIVE_SUPPORT]:
        return PolicyDecision(
            False,
            "Refusal: Offensive influence or support operations are strictly prohibited.",
        )

    if intent == Intent.DEFENSIVE_IW and not defense_mode:
        return PolicyDecision(
            False,
            "Refusal: Defensive IW workflows are intentionally constrained when defense mode is disabled.",
        )

    if intent in [Intent.DEFENSIVE_IW, Intent.RESILIENCE_DRILL]:
        requires_human_review = requester_role not in {
            "analyst",
            "incident_responder",
            "security_engineer",
        }
        return PolicyDecision(
            True,
            "Approved: Request aligns with defensive and resilience mission.",
            requires_human_review=requires_human_review,
        )

    if intent == Intent.ACADEMIC_RESEARCH:
        return PolicyDecision(
            True,
            "Approved: Research-oriented request is permitted with non-operational scope.",
            requires_human_review=False,
        )

    return PolicyDecision(False, "Refusal: Intent is unknown or unclassified.")


def classify_intent(text: str) -> Intent:
    lower_text = text.lower()

    offensive_keywords = [
        "generate propaganda",
        "create persuasion campaign",
        "microtarget",
        "manipulate population",
        "seed discord",
        "influence operation",
        "persuasion plan",
        "psychographic targeting",
        "target susceptible audiences",
    ]

    defensive_keywords = [
        "detect indicators",
        "generate warning",
        "summarize anomalies",
        "resilience drill",
        "check metrics",
        "countermeasure",
        "indicators of coordinated narrative",
        "monitor narrative shift",
        "identify coordination anomalies",
    ]

    research_keywords = [
        "literature review",
        "academic research",
        "theoretical framework",
        "summarize findings",
        "policy analysis",
    ]

    for kw in offensive_keywords:
        if kw in lower_text:
            return Intent.OFFENSIVE_INFLUENCE

    for kw in defensive_keywords:
        if kw in lower_text:
            return Intent.DEFENSIVE_IW

    for kw in research_keywords:
        if kw in lower_text:
            return Intent.ACADEMIC_RESEARCH

    return Intent.UNKNOWN
