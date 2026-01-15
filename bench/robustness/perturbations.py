from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class Perturbation:
    """Describes how a prompt is modified to test robustness."""

    name: str
    description: str
    apply: Callable[[str], str]


def _inject_noise(text: str) -> str:
    return f"[noisy-channel] {text} -- random sensor jitter and logging noise injected"


def _swap_locale(text: str) -> str:
    return text.replace("and", "y").replace("Include", "Incluye") + " (es-mx locale drift)"


def _reverse_order(text: str) -> str:
    parts = text.split("; ")
    if len(parts) > 1:
        parts.reverse()
        return "; ".join(parts)
    return f"Reverse-order:: {text}"


def _remove_units(text: str) -> str:
    return (
        text.replace("6-month", "six month")
        .replace("45-minute", "45m")
        .replace("lead times", "lead")
    )


def _push_edge_case(text: str) -> str:
    return (
        f"{text} Assume worst-case data sparsity and contradictory telemetry."
        f" Require explicit uncertainty quantification."
    )


PERTURBATIONS: list[Perturbation] = [
    Perturbation(
        name="noisy-channel",
        description="Inject logging noise and channel markers to evaluate resilience to clutter.",
        apply=_inject_noise,
    ),
    Perturbation(
        name="locale-drift",
        description="Mix English and Spanish tokens to probe locale robustness.",
        apply=_swap_locale,
    ),
    Perturbation(
        name="reverse-order",
        description="Reorders clauses to test instruction following after structure changes.",
        apply=_reverse_order,
    ),
    Perturbation(
        name="unit-drop",
        description="Removes or abbreviates units to surface reliance on explicit numerics.",
        apply=_remove_units,
    ),
    Perturbation(
        name="edge-pressure",
        description="Amplifies uncertainty and contradiction cues to test guardrails.",
        apply=_push_edge_case,
    ),
]
