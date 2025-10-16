"""Early-warning ensemble scoring for deepfake influence detection.

Implements ``score_alert`` for combining multi-model signals with provenance
and policy gating. The fusion strategy follows a simple Bayesian evidence
update so that each model contributes probabilistic evidence instead of
naively averaging raw scores. This emphasises calibrated risk estimation and
explicit uncertainty tracking which downstream reviewers can audit.
"""

from __future__ import annotations

from collections.abc import Iterable
from math import sqrt
from typing import Any


def _extract_signal(signal: dict[str, Any]) -> tuple[float, float]:
    """Normalise a model signal into (score, weight).

    Scores are clamped to ``[0, 1]``. ``confidence`` (or ``weight``) metadata is
    interpreted as the strength of evidence for the Bayesian update. When not
    provided we fall back to ``1.0`` which keeps behaviour compatible with
    legacy callers.
    """

    raw_score = float(signal.get("score", 0.0))
    score = min(max(raw_score, 0.0), 1.0)

    weight = float(signal.get("confidence", signal.get("weight", 1.0)))
    if weight < 0:
        weight = 0.0

    return score, weight


def _bayesian_fuse(signals: Iterable[tuple[str, dict[str, Any]]]) -> dict[str, Any]:
    """Fuse detector signals with a Beta-Bernoulli posterior."""

    alpha = 1.0  # prior success pseudo-count
    beta = 1.0  # prior failure pseudo-count
    weights: list[float] = []
    scores: list[float] = []
    explain: dict[str, Any] = {}
    model_weights: dict[str, float] = {}

    for name, signal in signals:
        score, weight = _extract_signal(signal)
        explain[name] = signal.get("explain")
        model_weights[name] = round(weight, 3)

        if weight == 0:
            continue

        alpha += score * weight
        beta += (1.0 - score) * weight
        weights.append(weight)
        scores.append(score)

    total_weight = sum(weights)
    if total_weight:
        mean = sum(w * s for w, s in zip(weights, scores, strict=False)) / total_weight
        variance = (
            sum(w * (s - mean) ** 2 for w, s in zip(weights, scores, strict=False)) / total_weight
        )
        disagreement = sqrt(variance)
    else:
        mean = 0.0
        disagreement = 0.0

    posterior_mass = alpha + beta
    posterior_mean = alpha / posterior_mass if posterior_mass else 0.0
    posterior_var = (
        (alpha * beta) / (posterior_mass**2 * (posterior_mass + 1.0)) if posterior_mass > 0 else 0.0
    )

    return {
        "posterior_mean": posterior_mean,
        "posterior_std": sqrt(posterior_var) if posterior_var > 0 else 0.0,
        "disagreement": disagreement,
        "explain": explain,
        "model_weights": model_weights,
        "alpha": alpha,
        "beta": beta,
        "evidence_mean": mean,
    }


def score_alert(evidence: dict[str, Any], models: Any, policy: Any) -> dict[str, Any]:
    """Aggregate model scores and attach provenance and policy context.

    Parameters
    ----------
    evidence: Dict[str, Any]
        Evidence bundle containing transcript, media bytes, metadata and
        provenance chain.
    models: Any
        Container exposing ``text_clf.predict_proba``, ``av_forgery.detect``
        and ``meta_anom.score`` methods.
    policy: Any
        Object with ``reasoner`` for evaluating export governance.

    Returns
    -------
    Dict[str, Any]
        Alert payload with Bayesian risk score, disagreement metric and
        explanations suitable for audit trails.
    """

    signals = [
        ("text", models.text_clf.predict_proba(evidence["transcript"])),
        ("av", models.av_forgery.detect(evidence["media_bytes"])),
        ("meta", models.meta_anom.score(evidence["metadata"])),
    ]

    fused = _bayesian_fuse(signals)

    return {
        "risk_score": round(fused["posterior_mean"], 3),
        "disagreement": round(fused["disagreement"], 3),
        "uncertainty": round(fused["posterior_std"], 3),
        "provenance": evidence.get("provenance_chain", []),
        "policy_gate": policy.reasoner(evidence),
        "explain": fused["explain"],
        "model_weights": fused["model_weights"],
        "posterior": {"alpha": round(fused["alpha"], 3), "beta": round(fused["beta"], 3)},
        "evidence_mean": round(fused["evidence_mean"], 3),
    }
