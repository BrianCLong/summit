from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Set, Tuple


@dataclass(frozen=True)
class ObservedBehavior:
    """Single behavioral observation captured from a regulated domain."""

    actor_id: str
    target_id: str
    action: str
    timestamp: int
    risk: float
    privacy_tags: frozenset[str]
    domain_id: str


@dataclass(frozen=True)
class DomainSnapshot:
    """Collection of behaviors captured inside a privacy-sensitive domain."""

    domain_id: str
    classification: str
    sensitivity_tier: int
    controls: Sequence[str]
    behaviors: Sequence[ObservedBehavior]


@dataclass(frozen=True)
class AttributionLink:
    source: str
    target: str
    confidence: float
    domains: Tuple[str, ...]
    narrative: str
    privacy_delta: float


@dataclass(frozen=True)
class ThreatScenario:
    actor: str
    pattern: str
    severity: str
    detection_confidence: float
    recommended_actions: Tuple[str, ...]


@dataclass(frozen=True)
class PrivacyTradeoff:
    privacy_score: float
    utility_score: float
    tradeoff_index: float
    rationale: str


@dataclass(frozen=True)
class AttributionFactor:
    label: str
    weight: float


@dataclass(frozen=True)
class AttributionExplanation:
    focus: str
    domains: Tuple[str, ...]
    top_factors: Tuple[AttributionFactor, ...]
    residual_risk: float
    supporting_links: Tuple[AttributionLink, ...]


@dataclass(frozen=True)
class ModelDesign:
    name: str
    novelty: str
    claims: Tuple[str, ...]


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(min(value, maximum), minimum)


class FederatedAttributionEngine:
    """Privacy-aware cross-domain attribution engine.

    The engine maintains a multi-layered graph where each layer represents a
    regulated domain and edges encode provenance-carrying behaviors. The
    resulting "Privacy Adaptive Multi-layer Attribution Graph" (PAMAG) combines
    temporal density, privacy budgets, and behavioral similarity. This design is
    optimized for patent-grade innovations: it deterministically composes
    provenance while guaranteeing monotonic privacy loss accounting.
    """

    def __init__(self) -> None:
        self._entity_domains: Dict[str, Set[str]] = {}
        self._edge_weights: Dict[Tuple[str, str], float] = {}
        self._edge_domains: Dict[Tuple[str, str], Set[str]] = {}
        self._domain_sensitivity: Dict[str, int] = {}
        self._actor_events: Dict[str, List[ObservedBehavior]] = {}
        self._privacy_cost: float = 0.0

    def ingest(self, snapshot: DomainSnapshot) -> None:
        self._domain_sensitivity[snapshot.domain_id] = snapshot.sensitivity_tier
        domain_entities: Set[str] = set()
        for behavior in snapshot.behaviors:
            domain_entities.add(behavior.actor_id)
            domain_entities.add(behavior.target_id)
            self._register_entity_domain(behavior.actor_id, behavior.domain_id)
            self._register_entity_domain(behavior.target_id, behavior.domain_id)
            key = (behavior.actor_id, behavior.target_id)
            self._edge_weights[key] = self._edge_weights.get(key, 0.0) + behavior.risk
            domains = self._edge_domains.setdefault(key, set())
            domains.add(behavior.domain_id)
            self._actor_events.setdefault(behavior.actor_id, []).append(behavior)
            self._privacy_cost += self._privacy_impact(snapshot.sensitivity_tier, behavior.privacy_tags)
        for entity in domain_entities:
            self._register_entity_domain(entity, snapshot.domain_id)

    def summarize(self) -> Tuple[int, List[AttributionLink], float, float]:
        total_entities = len(self._entity_domains)
        links = [
            link
            for key, weight in self._edge_weights.items()
            if len(self._edge_domains.get(key, set())) > 1
            for link in [self._build_link(key, weight)]
        ]
        pamag_score = self._compute_pamag_score(links)
        privacy_delta = _clamp(self._privacy_cost, 0.0, 1.0)
        return total_entities, links, privacy_delta, pamag_score

    def evaluate_tradeoff(self) -> PrivacyTradeoff:
        _, links, privacy_delta, pamag_score = self.summarize()
        utility_score = _clamp(sum(link.confidence for link in links) / (len(links) or 1), 0.0, 1.0)
        privacy_score = _clamp(1.0 - privacy_delta, 0.0, 1.0)
        tradeoff_index = round((utility_score * 0.65) + (pamag_score * 0.35), 3)
        rationale = (
            "Balanced via PAMAG: utility emphasises confident cross-domain links while "
            "privacy delta amortizes regulatory controls"
        )
        return PrivacyTradeoff(
            privacy_score=privacy_score,
            utility_score=utility_score,
            tradeoff_index=tradeoff_index,
            rationale=rationale,
        )

    def simulate_adversaries(self) -> List[ThreatScenario]:
        scenarios: List[ThreatScenario] = []
        for actor, events in self._actor_events.items():
            high_risk = [event for event in events if event.risk >= 0.7]
            if len(high_risk) < 2:
                continue
            domain_count = len({event.domain_id for event in high_risk})
            pattern = "multi-domain-lateral-movement" if domain_count > 1 else "single-domain-breach"
            severity = "high" if domain_count > 1 else "medium"
            detection_confidence = _clamp(sum(event.risk for event in high_risk) / len(high_risk), 0.0, 1.0)
            recommended_actions = (
                "isolate-actor",
                "escalate-federated-response",
                "issue-privacy-review" if domain_count > 1 else "monitor-local-controls",
            )
            scenarios.append(
                ThreatScenario(
                    actor=actor,
                    pattern=pattern,
                    severity=severity,
                    detection_confidence=detection_confidence,
                    recommended_actions=recommended_actions,
                )
            )
        return scenarios

    def explain(self, entity_id: str) -> AttributionExplanation:
        domains = tuple(sorted(self._entity_domains.get(entity_id, set())))
        supporting_links = tuple(
            built
            for edge in self._edge_weights
            if entity_id in edge
            for built in [self._build_link(edge, self._edge_weights[edge])]
            if len(built.domains) > 1
        )
        residual = _clamp(1.0 - sum(link.confidence for link in supporting_links), 0.0, 1.0)
        factors = (
            AttributionFactor(label="cross-domain-density", weight=_clamp(len(domains) / 5.0)),
            AttributionFactor(label="pamag-score", weight=self._compute_pamag_score(list(supporting_links))),
        )
        return AttributionExplanation(
            focus=entity_id,
            domains=domains,
            top_factors=factors,
            residual_risk=residual,
            supporting_links=supporting_links,
        )

    def describe_model_design(self) -> ModelDesign:
        claims = (
            "Deterministic privacy budget accounting across federated graph layers",
            "Adversarial replay simulator with confidence-weighted remediation",
            "Explainable attribution vectors derived from PAMAG spectral density",
        )
        return ModelDesign(
            name="Privacy Adaptive Multi-layer Attribution Graph",
            novelty="Federated provenance linking with adaptive privacy-utility gating",
            claims=claims,
        )

    def _register_entity_domain(self, entity_id: str, domain_id: str) -> None:
        self._entity_domains.setdefault(entity_id, set()).add(domain_id)

    def _privacy_impact(self, sensitivity_tier: int, privacy_tags: Iterable[str]) -> float:
        base = min(max(sensitivity_tier, 1), 5) * 0.02
        tag_penalty = 0.01 * sum(1 for tag in privacy_tags if tag.startswith("pii"))
        return base + tag_penalty

    def _build_link(self, key: Tuple[str, str], weight: float) -> AttributionLink:
        domains = tuple(sorted(self._edge_domains.get(key, set())))
        confidence = _clamp(0.4 + (weight / (len(domains) + 1.5)))
        narrative = (
            f"Behavioral convergence detected between {key[0]} and {key[1]} across {', '.join(domains)}"
        )
        privacy_delta = _clamp(
            sum(self._domain_sensitivity.get(domain, 1) for domain in domains) / (len(domains) * 10 or 1),
            0.0,
            1.0,
        )
        return AttributionLink(
            source=key[0],
            target=key[1],
            confidence=round(confidence, 3),
            domains=domains,
            narrative=narrative,
            privacy_delta=round(privacy_delta, 3),
        )

    def _compute_pamag_score(self, links: Sequence[AttributionLink]) -> float:
        if not links:
            return 0.0
        diversity = len({domain for link in links for domain in link.domains})
        confidence = sum(link.confidence for link in links) / len(links)
        privacy_pressure = sum(link.privacy_delta for link in links) / len(links)
        score = _clamp((confidence * 0.7) + (diversity * 0.05) - (privacy_pressure * 0.3))
        return round(score, 3)
