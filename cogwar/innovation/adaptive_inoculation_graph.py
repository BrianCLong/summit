from __future__ import annotations

import os
import uuid
from collections import defaultdict
from typing import Any

from cogwar.policy.intent import Intent
from cogwar.policy.rules import evaluate_request

FEATURE_FLAG = "COGWAR_INNOVATION"

_SEVERITY_WEIGHT = {
    "low": 1.0,
    "med": 1.8,
    "medium": 1.8,
    "high": 2.8,
    "critical": 4.0,
}

_CHANNEL_ACTIONS = {
    "social": "Deploy prebunk card + friction prompts for flagged claims",
    "video": "Publish clipped context rebuttal with source-backed timeline",
    "messaging": "Trigger moderator escalation macro and claim quarantine",
    "web": "Inject provenance banner and source reliability badge",
    "broadcast": "Issue rapid-response factsheet for partner spokespeople",
    "unknown": "Escalate to analyst queue for channel-specific intervention",
}


def _ensure_feature_enabled() -> None:
    if os.environ.get(FEATURE_FLAG, "false").lower() != "true":
        raise PermissionError(f"Feature {FEATURE_FLAG} is disabled.")


def _normalize_intent(intent: Intent | str | None) -> Intent:
    if isinstance(intent, Intent):
        return intent
    if isinstance(intent, str):
        token = intent.strip().upper()
        try:
            return Intent[token]
        except KeyError:
            return Intent.UNKNOWN
    return Intent.UNKNOWN


def _score_indicator(indicator: dict[str, Any]) -> float:
    severity = str(indicator.get("severity", "low")).lower()
    confidence = float(indicator.get("confidence", 0.0))
    velocity = float(indicator.get("velocity", 0.0))
    novelty = float(indicator.get("novelty", 0.0))

    severity_weight = _SEVERITY_WEIGHT.get(severity, _SEVERITY_WEIGHT["low"])

    # Defensive friction score balances threat confidence with spread velocity and novelty.
    return round((severity_weight * confidence) + (0.35 * velocity) + (0.2 * novelty), 4)


def _group_key(indicator: dict[str, Any]) -> tuple[str, str]:
    channel = str(indicator.get("channel", "unknown")).strip().lower() or "unknown"
    narrative = str(indicator.get("narrative_family", "unclassified")).strip().lower() or "unclassified"
    return channel, narrative


def build_adaptive_inoculation_graph(
    indicators: list[dict[str, Any]],
    *,
    intent: Intent | str = Intent.DEFENSIVE_IW,
    max_actions: int = 5,
) -> dict[str, Any]:
    """
    Build a defensive intervention graph from IW indicators.

    This is a defensive-only innovation primitive intended for warning enrichment,
    not offensive targeting or content generation.
    """
    _ensure_feature_enabled()

    normalized_intent = _normalize_intent(intent)
    decision = evaluate_request(normalized_intent)
    if not decision.allowed:
        raise PermissionError(decision.reason)

    if max_actions < 1:
        raise ValueError("max_actions must be >= 1")

    buckets: dict[tuple[str, str], dict[str, Any]] = defaultdict(
        lambda: {
            "score": 0.0,
            "indicator_ids": [],
            "evidence_refs": [],
            "avg_confidence": 0.0,
            "count": 0,
        }
    )

    for indicator in indicators:
        key = _group_key(indicator)
        bucket = buckets[key]
        score = _score_indicator(indicator)
        bucket["score"] += score
        bucket["count"] += 1
        bucket["avg_confidence"] += float(indicator.get("confidence", 0.0))
        indicator_id = str(indicator.get("id", "")).strip()
        if indicator_id:
            bucket["indicator_ids"].append(indicator_id)
            bucket["evidence_refs"].append(indicator_id)

    ranked_segments: list[dict[str, Any]] = []
    for (channel, narrative), bucket in buckets.items():
        count = bucket["count"] or 1
        avg_confidence = round(bucket["avg_confidence"] / count, 4)
        ranked_segments.append(
            {
                "channel": channel,
                "narrative_family": narrative,
                "segment_score": round(bucket["score"], 4),
                "avg_confidence": avg_confidence,
                "indicator_ids": sorted(set(bucket["indicator_ids"])),
                "evidence_refs": sorted(set(bucket["evidence_refs"])),
            }
        )

    ranked_segments.sort(
        key=lambda segment: (segment["segment_score"], segment["avg_confidence"]),
        reverse=True,
    )

    interventions: list[dict[str, Any]] = []
    for priority, segment in enumerate(ranked_segments[:max_actions], start=1):
        channel = segment["channel"]
        action = _CHANNEL_ACTIONS.get(channel, _CHANNEL_ACTIONS["unknown"])
        interventions.append(
            {
                "priority": priority,
                "channel": channel,
                "narrative_family": segment["narrative_family"],
                "action": action,
                "expected_risk_reduction": round(min(0.15 + 0.1 * priority, 0.55), 2),
                "evidence_refs": segment["evidence_refs"],
            }
        )

    return {
        "plan_id": f"AIG-{uuid.uuid4().hex[:10]}",
        "intent": normalized_intent.name,
        "decision": decision.reason,
        "segments": ranked_segments,
        "interventions": interventions,
        "recommended_actions": [item["action"] for item in interventions],
    }
