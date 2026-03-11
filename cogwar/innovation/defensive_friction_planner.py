from __future__ import annotations

import itertools
import math
import os
from dataclasses import dataclass
from typing import Any

FEATURE_FLAG = "COGWAR_INNOVATION"

SEVERITY_WEIGHTS = {
    "low": 0.20,
    "medium": 0.45,
    "high": 0.75,
    "critical": 0.95,
}

# Maps indicator modality into how much pressure it contributes to each channel.
CHANNEL_COUPLING = {
    "info": {"broadcast": 0.70, "community": 0.20, "private": 0.10, "immersive": 0.00},
    "social": {"broadcast": 0.25, "community": 0.55, "private": 0.20, "immersive": 0.00},
    "behavioral": {"broadcast": 0.05, "community": 0.35, "private": 0.35, "immersive": 0.25},
    "cyber": {"broadcast": 0.10, "community": 0.10, "private": 0.35, "immersive": 0.45},
}

DEFAULT_INTERVENTION_CATALOG = [
    {
        "id": "prebunk-cells",
        "name": "Prebunking Cells",
        "intent": "defensive",
        "target_channels": ["broadcast", "community"],
        "friction_gain": 0.16,
        "decay_gain": 0.05,
        "cost": 1.2,
        "reversibility": 0.95,
        "latency_steps": 0,
    },
    {
        "id": "source-labeling",
        "name": "Trusted Source Labeling",
        "intent": "defensive",
        "target_channels": ["broadcast", "community", "private"],
        "friction_gain": 0.14,
        "decay_gain": 0.04,
        "cost": 1.0,
        "reversibility": 0.98,
        "latency_steps": 0,
    },
    {
        "id": "coordinated-throttling",
        "name": "Coordinated Throttling",
        "intent": "defensive",
        "target_channels": ["broadcast", "private"],
        "friction_gain": 0.21,
        "decay_gain": 0.03,
        "cost": 1.7,
        "reversibility": 0.72,
        "latency_steps": 1,
    },
    {
        "id": "immersive-integrity-prompt",
        "name": "Immersive Integrity Prompts",
        "intent": "defensive",
        "target_channels": ["immersive"],
        "friction_gain": 0.24,
        "decay_gain": 0.02,
        "cost": 1.1,
        "reversibility": 0.89,
        "latency_steps": 0,
    },
    {
        "id": "rapid-forensics",
        "name": "Rapid Provenance Forensics",
        "intent": "defensive",
        "target_channels": ["broadcast", "community", "private", "immersive"],
        "friction_gain": 0.13,
        "decay_gain": 0.07,
        "cost": 1.9,
        "reversibility": 0.96,
        "latency_steps": 1,
    },
]


@dataclass(frozen=True)
class PlanCandidate:
    bundle: tuple[dict[str, Any], ...]
    score: float
    risk_curve: list[float]
    baseline_curve: list[float]


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _is_enabled() -> bool:
    return os.environ.get(FEATURE_FLAG, "false").lower() == "true"


def _validate_defensive_catalog(catalog: list[dict[str, Any]]) -> None:
    for intervention in catalog:
        if intervention.get("intent") != "defensive":
            identifier = intervention.get("id", "unknown")
            raise ValueError(f"Intervention {identifier} is not defensive")


def _channel_pressure(indicators: list[dict[str, Any]]) -> dict[str, float]:
    pressure = {"broadcast": 0.0, "community": 0.0, "private": 0.0, "immersive": 0.0}

    for indicator in indicators:
        severity = str(indicator.get("severity", "low")).lower()
        modality = str(indicator.get("modality", "info")).lower()
        confidence = float(indicator.get("confidence", 0.0))

        base = SEVERITY_WEIGHTS.get(severity, SEVERITY_WEIGHTS["low"]) * _clamp(confidence)
        coupling = CHANNEL_COUPLING.get(modality, CHANNEL_COUPLING["info"])

        for channel, weight in coupling.items():
            pressure[channel] += base * weight

    if not indicators:
        return pressure

    normalizer = max(1.0, float(len(indicators)) * 0.85)
    for channel in pressure:
        pressure[channel] = _clamp(pressure[channel] / normalizer)

    return pressure


def _simulate_curve(
    starting_pressure: dict[str, float],
    bundle: tuple[dict[str, Any], ...],
    horizon_steps: int,
) -> list[float]:
    channel_pressure = dict(starting_pressure)
    risk_curve: list[float] = []

    for step in range(horizon_steps):
        for channel, value in list(channel_pressure.items()):
            active = [
                it
                for it in bundle
                if channel in it["target_channels"] and int(it.get("latency_steps", 0)) <= step
            ]

            friction = sum(float(it["friction_gain"]) for it in active)
            decay = 0.025 + sum(float(it["decay_gain"]) for it in active)

            # Saturation: more pressure leaves less room for additional growth.
            growth = 0.06 * value * (1.0 - value)
            # Friction and decay lower pressure while preserving deterministic floor.
            next_value = value + growth - friction * 0.09 - decay * value
            channel_pressure[channel] = _clamp(next_value)

        # Spillover between channels captures cross-platform adaptation pressure.
        mean_pressure = sum(channel_pressure.values()) / len(channel_pressure)
        for channel in channel_pressure:
            channel_pressure[channel] = _clamp(channel_pressure[channel] * 0.93 + mean_pressure * 0.07)

        weighted = (
            channel_pressure["broadcast"] * 0.35
            + channel_pressure["community"] * 0.30
            + channel_pressure["private"] * 0.20
            + channel_pressure["immersive"] * 0.15
        )
        risk_curve.append(round(_clamp(weighted), 4))

    return risk_curve


def _evaluate_bundle(
    pressure: dict[str, float],
    bundle: tuple[dict[str, Any], ...],
    horizon_steps: int,
) -> PlanCandidate:
    baseline_curve = _simulate_curve(pressure, tuple(), horizon_steps)
    risk_curve = _simulate_curve(pressure, bundle, horizon_steps)

    risk_reduction = baseline_curve[-1] - risk_curve[-1]
    avg_reversibility = (
        sum(float(item["reversibility"]) for item in bundle) / len(bundle) if bundle else 1.0
    )
    total_cost = sum(float(item["cost"]) for item in bundle)

    score = (risk_reduction * 0.75) + (avg_reversibility * 0.20) - (math.log1p(total_cost) * 0.05)
    return PlanCandidate(bundle=bundle, score=score, risk_curve=risk_curve, baseline_curve=baseline_curve)


def build_defensive_friction_plan(
    indicators: list[dict[str, Any]],
    intervention_catalog: list[dict[str, Any]] | None = None,
    max_budget: float = 3.2,
    horizon_steps: int = 6,
) -> dict[str, Any]:
    """
    Build a defensive-only intervention bundle by simulating cross-channel pressure
    and selecting the best bundle under cost and reversibility constraints.
    """
    if not _is_enabled():
        raise PermissionError(f"Feature {FEATURE_FLAG} is disabled.")

    catalog = list(intervention_catalog or DEFAULT_INTERVENTION_CATALOG)
    _validate_defensive_catalog(catalog)

    pressure = _channel_pressure(indicators)
    baseline_curve = _simulate_curve(pressure, tuple(), horizon_steps)

    candidates: list[PlanCandidate] = []
    max_size = min(3, len(catalog))
    for size in range(1, max_size + 1):
        for bundle in itertools.combinations(catalog, size):
            total_cost = sum(float(item["cost"]) for item in bundle)
            min_reversibility = min(float(item["reversibility"]) for item in bundle)
            if total_cost > max_budget or min_reversibility < 0.65:
                continue
            candidates.append(_evaluate_bundle(pressure, bundle, horizon_steps))

    if not candidates:
        selected: tuple[dict[str, Any], ...] = tuple()
        risk_curve = baseline_curve
    else:
        # Deterministic tie-break: highest score, then lowest cost, then lexical ids.
        best = sorted(
            candidates,
            key=lambda c: (
                -c.score,
                sum(float(item["cost"]) for item in c.bundle),
                ",".join(item["id"] for item in c.bundle),
            ),
        )[0]
        selected = best.bundle
        risk_curve = best.risk_curve

    selected_ids = [item["id"] for item in selected]
    total_cost = round(sum(float(item["cost"]) for item in selected), 3)
    avg_reversibility = (
        round(sum(float(item["reversibility"]) for item in selected) / len(selected), 3)
        if selected
        else 1.0
    )

    residual = risk_curve[-1] if risk_curve else 0.0
    baseline = baseline_curve[-1] if baseline_curve else 0.0
    risk_reduction = round(max(0.0, baseline - residual), 4)
    confidence = round(_clamp(0.55 + risk_reduction * 0.9 + avg_reversibility * 0.1), 4)

    rollback_triggers = [
        "False-positive adjudication rate exceeds 0.12 over 24h",
        "Operator escalation queue latency exceeds 30 minutes",
        "Observed user appeal overturns exceed governed threshold",
    ]

    rationale = [
        "Selected bundle maximizes projected risk reduction under budget and reversibility constraints.",
        "Cross-channel spillover simulation captures adaptation pressure across broadcast/community/private/immersive lanes.",
    ]

    return {
        "plan_id": "DFP-V1",
        "objective": "Reduce cognitive attack propagation while preserving reversibility and analyst control.",
        "selected_intervention_ids": selected_ids,
        "selected_interventions": list(selected),
        "projected_baseline_curve": baseline_curve,
        "projected_residual_curve": risk_curve,
        "projected_risk_reduction": risk_reduction,
        "projected_residual_risk": round(residual, 4),
        "max_budget": max_budget,
        "total_cost": total_cost,
        "average_reversibility": avg_reversibility,
        "confidence": confidence,
        "rollback_triggers": rollback_triggers,
        "rationale": rationale,
        "caveats": [
            "Simulation uses aggregate indicators and does not infer actor identity.",
            "Channel coupling coefficients are policy-tunable and should be calibrated with post-incident evidence.",
        ],
    }
