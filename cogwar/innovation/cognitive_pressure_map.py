import os
from typing import Any

from cogwar.policy.intent import Intent
from cogwar.policy.rules import evaluate_request

FEATURE_FLAG = "COGWAR_INNOVATION"

_SEVERITY_WEIGHTS = {
    "low": 0.2,
    "medium": 0.5,
    "high": 0.8,
    "critical": 1.0,
}

_ACTION_CATALOG = (
    {
        "action_id": "prebunk-pack",
        "label": "Deploy narrative prebunking pack",
        "cost": 1,
        "base_effectiveness": 0.32,
    },
    {
        "action_id": "messenger-amplify",
        "label": "Amplify trusted messenger network",
        "cost": 2,
        "base_effectiveness": 0.48,
    },
    {
        "action_id": "source-transparency-brief",
        "label": "Publish source transparency brief",
        "cost": 1,
        "base_effectiveness": 0.29,
    },
    {
        "action_id": "platform-escalation",
        "label": "Escalate coordinated behavior to platforms",
        "cost": 3,
        "base_effectiveness": 0.62,
    },
)

_CHANNEL_ACTION_MULTIPLIER = {
    "social": {
        "prebunk-pack": 1.05,
        "messenger-amplify": 1.1,
        "source-transparency-brief": 0.95,
        "platform-escalation": 1.15,
    },
    "messaging": {
        "prebunk-pack": 0.95,
        "messenger-amplify": 1.12,
        "source-transparency-brief": 0.88,
        "platform-escalation": 1.1,
    },
    "news": {
        "prebunk-pack": 0.9,
        "messenger-amplify": 1.0,
        "source-transparency-brief": 1.18,
        "platform-escalation": 0.85,
    },
    "video": {
        "prebunk-pack": 1.0,
        "messenger-amplify": 1.08,
        "source-transparency-brief": 0.92,
        "platform-escalation": 1.06,
    },
}


def _innovation_enabled() -> bool:
    return os.environ.get(FEATURE_FLAG, "false").lower() == "true"


def _normalize_channel(channel: str) -> str:
    lowered = (channel or "").strip().lower()
    if lowered in _CHANNEL_ACTION_MULTIPLIER:
        return lowered
    return "social"


def _indicator_pressure(indicator: dict[str, Any]) -> float:
    severity = str(indicator.get("severity", "low")).lower()
    severity_score = _SEVERITY_WEIGHTS.get(severity, 0.2)
    confidence = float(indicator.get("confidence", 0.0))

    channels = indicator.get("channels") or [indicator.get("channel", "social")]
    normalized_channels = {_normalize_channel(ch) for ch in channels if ch}
    channel_bonus = min(max(len(normalized_channels) - 1, 0) * 0.1, 0.25)
    pressure = (severity_score * 0.55) + (confidence * 0.45) + channel_bonus
    return min(round(pressure, 4), 1.0)


def _generate_candidates(
    narrative_pressure: dict[str, float], narrative_channels: dict[str, str]
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for narrative_id, pressure in narrative_pressure.items():
        primary_channel = narrative_channels.get(narrative_id, "social")
        channel_map = _CHANNEL_ACTION_MULTIPLIER.get(primary_channel, _CHANNEL_ACTION_MULTIPLIER["social"])
        for action in _ACTION_CATALOG:
            multiplier = channel_map[action["action_id"]]
            expected_risk_reduction = round(pressure * action["base_effectiveness"] * multiplier, 4)
            candidates.append(
                {
                    "narrative_id": narrative_id,
                    "action_id": action["action_id"],
                    "label": action["label"],
                    "channel": primary_channel,
                    "cost": action["cost"],
                    "expected_risk_reduction": expected_risk_reduction,
                    "score_per_cost": round(expected_risk_reduction / action["cost"], 4),
                }
            )
    candidates.sort(
        key=lambda item: (
            -item["score_per_cost"],
            -item["expected_risk_reduction"],
            item["action_id"],
            item["narrative_id"],
        )
    )
    return candidates


def _select_portfolio(candidates: list[dict[str, Any]], budget: int) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    used_budget = 0
    used_keys: set[str] = set()

    for candidate in candidates:
        key = f'{candidate["narrative_id"]}:{candidate["action_id"]}'
        candidate_cost = int(candidate["cost"])
        if key in used_keys or (used_budget + candidate_cost) > budget:
            continue
        selected.append(candidate)
        used_keys.add(key)
        used_budget += candidate_cost
        if used_budget >= budget:
            break

    return selected


def build_cognitive_pressure_map(
    indicators: list[dict[str, Any]], budget: int = 4
) -> dict[str, Any]:
    if not _innovation_enabled():
        raise PermissionError(f"Feature {FEATURE_FLAG} is disabled.")

    decision = evaluate_request(Intent.DEFENSIVE_IW)
    if not decision.allowed:
        raise PermissionError(f"Policy denied cognitive pressure map: {decision.reason}")

    if not indicators:
        return {
            "version": "CPME-V1",
            "budget": budget,
            "narrative_pressure": [],
            "channel_heatmap": [],
            "recommended_portfolio": [],
            "expected_total_risk_reduction": 0.0,
            "defensive_only": True,
        }

    narrative_scores: dict[str, float] = {}
    narrative_channel_scores: dict[str, dict[str, float]] = {}
    channel_totals: dict[str, float] = {}

    for indicator in indicators:
        narrative_id = str(
            indicator.get("narrative_id")
            or indicator.get("name")
            or indicator.get("id")
            or "unknown-narrative"
        )
        pressure = _indicator_pressure(indicator)
        narrative_scores[narrative_id] = narrative_scores.get(narrative_id, 0.0) + pressure

        channels = indicator.get("channels") or [indicator.get("channel", "social")]
        unique_channels = {_normalize_channel(ch) for ch in channels if ch}
        if not unique_channels:
            unique_channels = {"social"}

        if narrative_id not in narrative_channel_scores:
            narrative_channel_scores[narrative_id] = {}

        shared_pressure = pressure / len(unique_channels)
        for channel in unique_channels:
            channel_totals[channel] = channel_totals.get(channel, 0.0) + shared_pressure
            existing = narrative_channel_scores[narrative_id].get(channel, 0.0)
            narrative_channel_scores[narrative_id][channel] = existing + shared_pressure

    narrative_pressure = sorted(
        (
            {"narrative_id": narrative_id, "pressure_score": round(score, 4)}
            for narrative_id, score in narrative_scores.items()
        ),
        key=lambda item: (-item["pressure_score"], item["narrative_id"]),
    )

    narrative_primary_channel = {
        narrative_id: max(scores.items(), key=lambda item: item[1])[0]
        for narrative_id, scores in narrative_channel_scores.items()
    }

    candidates = _generate_candidates(narrative_scores, narrative_primary_channel)
    portfolio = _select_portfolio(candidates, max(1, int(budget)))
    expected_total = round(sum(item["expected_risk_reduction"] for item in portfolio), 4)

    channel_heatmap = sorted(
        (
            {"channel": channel, "pressure_score": round(score, 4)}
            for channel, score in channel_totals.items()
        ),
        key=lambda item: (-item["pressure_score"], item["channel"]),
    )

    return {
        "version": "CPME-V1",
        "budget": max(1, int(budget)),
        "narrative_pressure": narrative_pressure,
        "channel_heatmap": channel_heatmap,
        "recommended_portfolio": portfolio,
        "expected_total_risk_reduction": expected_total,
        "defensive_only": True,
    }
