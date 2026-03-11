import os
from typing import Any, Dict, List

FEATURE_FLAG = "COGWAR_INNOVATION"
SCHEMA_VERSION = "cogwar.countermeasure_playbook.v1"

_SEVERITY_WEIGHT = {
    "low": 0.25,
    "medium": 0.5,
    "high": 0.8,
    "critical": 1.0,
}

_ACTION_CATALOG = [
    {
        "action_id": "CM-A1",
        "title": "Launch prebunking burst on priority channels",
        "phase": "immediate",
        "cost": 3,
        "base_effectiveness": 0.72,
        "tags": ["narrative_shift", "amplification"],
    },
    {
        "action_id": "CM-A2",
        "title": "Synchronize trusted-messenger counter-brief",
        "phase": "immediate",
        "cost": 2,
        "base_effectiveness": 0.66,
        "tags": ["coordination", "credibility_attack"],
    },
    {
        "action_id": "CM-A3",
        "title": "Deploy typo-domain and spoof sinkhole watch",
        "phase": "short_term",
        "cost": 4,
        "base_effectiveness": 0.81,
        "tags": ["spoofing", "amplification"],
    },
    {
        "action_id": "CM-A4",
        "title": "Activate narrative fracture response cell",
        "phase": "short_term",
        "cost": 3,
        "base_effectiveness": 0.69,
        "tags": ["narrative_shift", "fear_trigger"],
    },
    {
        "action_id": "CM-A5",
        "title": "Start resilience inoculation content cadence",
        "phase": "sustained",
        "cost": 2,
        "base_effectiveness": 0.61,
        "tags": ["fatigue", "credibility_attack"],
    },
    {
        "action_id": "CM-A6",
        "title": "Open red-team rehearsal for next narrative pivot",
        "phase": "sustained",
        "cost": 1,
        "base_effectiveness": 0.52,
        "tags": ["coordination", "narrative_shift"],
    },
]


def _innovation_enabled() -> bool:
    return os.environ.get(FEATURE_FLAG, "false").lower() == "true"


def _safe_indicator_tags(indicator: Dict[str, Any]) -> List[str]:
    tags = indicator.get("tags", [])
    if isinstance(tags, list):
        return sorted(str(tag) for tag in tags)
    return []


def _confidence(indicator: Dict[str, Any]) -> float:
    value = indicator.get("confidence", 0.0)
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def _severity(indicator: Dict[str, Any]) -> float:
    severity_name = str(indicator.get("severity", "low")).lower()
    return _SEVERITY_WEIGHT.get(severity_name, _SEVERITY_WEIGHT["low"])


def _threat_vector(indicators: List[Dict[str, Any]]) -> Dict[str, float]:
    vector: Dict[str, float] = {}
    for indicator in sorted(indicators, key=lambda ind: str(ind.get("id", ""))):
        magnitude = (_severity(indicator) * 0.6) + (_confidence(indicator) * 0.4)
        indicator_tags = _safe_indicator_tags(indicator)
        fallback_name = str(indicator.get("name", "")).strip().lower().replace(" ", "_")
        if fallback_name:
            indicator_tags.append(fallback_name)
        if not indicator_tags:
            indicator_tags = ["unknown_signal"]
        for tag in indicator_tags:
            vector[tag] = round(vector.get(tag, 0.0) + magnitude, 4)
    return vector


def _score_action(
    action: Dict[str, Any], vector: Dict[str, float], indicators: List[Dict[str, Any]]
) -> float:
    matched_pressure = 0.0
    for tag in action["tags"]:
        matched_pressure += vector.get(tag, 0.0)

    baseline = action["base_effectiveness"] * (1.0 + matched_pressure * 0.15)
    confidence_factor = (
        sum(_confidence(indicator) for indicator in indicators) / max(1, len(indicators))
    )
    cost_penalty = action["cost"] * 0.07
    return round((baseline * 0.65 + confidence_factor * 0.35) - cost_penalty, 4)


def synthesize_countermeasure_playbook(
    indicators: List[Dict[str, Any]], max_budget: int = 10, max_actions: int = 4
) -> Dict[str, Any]:
    """
    Build a deterministic defensive playbook from observed indicators.
    """
    if not _innovation_enabled():
        raise PermissionError(f"Feature {FEATURE_FLAG} is disabled.")

    if max_budget < 1:
        raise ValueError("max_budget must be >= 1")
    if max_actions < 1:
        raise ValueError("max_actions must be >= 1")

    normalized_indicators = list(indicators)
    vector = _threat_vector(normalized_indicators)
    risk_index = round(
        (
            sum(_severity(indicator) + _confidence(indicator) for indicator in normalized_indicators)
            / max(1, len(normalized_indicators))
        )
        / 2.0,
        4,
    )

    scored_actions = []
    for action in _ACTION_CATALOG:
        score = _score_action(action, vector, normalized_indicators)
        scored_actions.append({**action, "priority_score": score})

    scored_actions.sort(
        key=lambda action: (-action["priority_score"], action["cost"], action["action_id"])
    )

    selected_actions: List[Dict[str, Any]] = []
    budget_remaining = max_budget
    for action in scored_actions:
        if len(selected_actions) >= max_actions:
            break
        if action["cost"] > budget_remaining:
            continue
        expected_risk_reduction = round(
            min(0.95, action["base_effectiveness"] * 0.7 + action["priority_score"] * 0.2),
            4,
        )
        selected_actions.append(
            {
                "action_id": action["action_id"],
                "title": action["title"],
                "phase": action["phase"],
                "cost": action["cost"],
                "priority_score": action["priority_score"],
                "expected_risk_reduction": expected_risk_reduction,
                "rationale": f"Matched tags: {', '.join(action['tags'])}",
            }
        )
        budget_remaining -= action["cost"]

    selected_actions.sort(key=lambda action: (action["phase"], action["action_id"]))

    timeline = []
    for phase_name in ["immediate", "short_term", "sustained"]:
        phase_ids = [a["action_id"] for a in selected_actions if a["phase"] == phase_name]
        timeline.append({"phase": phase_name, "action_ids": phase_ids})

    ranked_vector = sorted(vector.items(), key=lambda item: (-item[1], item[0]))
    strategy_focus = [tag for tag, _ in ranked_vector[:3]]

    return {
        "schema_version": SCHEMA_VERSION,
        "risk_index": risk_index,
        "strategy_focus": strategy_focus,
        "budget_used": max_budget - budget_remaining,
        "budget_remaining": budget_remaining,
        "selected_actions": selected_actions,
        "orchestration_timeline": timeline,
        "safeguards": [
            "Defensive-only action catalog; no offensive content generation.",
            "Human review required before high-impact public intervention.",
            "Actions are evidence-linked and deterministic under fixed inputs.",
        ],
    }
