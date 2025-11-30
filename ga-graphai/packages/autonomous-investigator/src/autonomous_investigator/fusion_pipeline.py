"""Cross-domain intelligence fusion pipeline for OSINT → FinIntel → Cyber."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable as IterableABC
from collections.abc import Mapping as MappingABC
from dataclasses import dataclass, field
from itertools import combinations
from statistics import mean
from typing import Any, Callable, Iterable, Literal, Mapping, Sequence

Domain = Literal["osint", "finintel", "cyber"]


@dataclass
class FusionEntity:
    """Entity observed in one of the intelligence domains."""

    id: str
    domain: Domain
    entity_type: str
    attributes: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.5
    sources: list[str] = field(default_factory=list)


@dataclass
class CorrelationResult:
    """Link across domains with a derived confidence score."""

    source: str
    target: str
    shared_attributes: set[str]
    rationale: str
    score: float
    domains: tuple[Domain, Domain]


@dataclass
class FusionPattern:
    """Cross-domain pattern spanning OSINT → FinIntel → Cyber."""

    description: str
    chain: list[str]
    confidence: float
    supporting_links: list[CorrelationResult]


@dataclass
class FusionOutcome:
    """Full pipeline result with enrichment, correlation, and patterns."""

    enriched_entities: list[FusionEntity]
    correlations: list[CorrelationResult]
    patterns: list[FusionPattern]


EnrichmentProvider = Callable[[FusionEntity], Mapping[str, Any]]


class IntelligenceFusionPipeline:
    """Correlates OSINT → FinIntel → Cyber signals with enrichment."""

    def __init__(
        self,
        enrichment_providers: Mapping[str, EnrichmentProvider] | None = None,
        min_correlation_score: float = 0.35,
    ) -> None:
        self.enrichment_providers = dict(enrichment_providers or {})
        self.min_correlation_score = min_correlation_score
        self.entities: dict[str, FusionEntity] = {}

    def ingest(self, entity: FusionEntity) -> None:
        """Register an entity for downstream fusion."""

        self.entities[entity.id] = entity

    def ingest_many(self, entities: Iterable[FusionEntity]) -> None:
        """Bulk ingest entities."""

        for entity in entities:
            self.ingest(entity)

    def run_pipeline(self) -> FusionOutcome:
        """Execute enrichment, correlation, and pattern detection."""

        enriched = self._enrich_entities()
        correlations = self._correlate_entities(enriched)
        patterns = self._detect_patterns(enriched, correlations)
        return FusionOutcome(
            enriched_entities=enriched,
            correlations=correlations,
            patterns=patterns,
        )

    def _enrich_entities(self) -> list[FusionEntity]:
        enriched: list[FusionEntity] = []
        for entity in self.entities.values():
            provider = self.enrichment_providers.get(entity.domain) or self.enrichment_providers.get(
                entity.entity_type
            )
            if provider:
                updates = provider(entity)
                if updates:
                    entity.attributes.update(updates)
                    delta = float(updates.get("confidence_delta", 0))
                    entity.confidence = _clamp(entity.confidence + delta, 0.05, 1.0)
            enriched.append(entity)
        return enriched

    def _correlate_entities(self, entities: Sequence[FusionEntity]) -> list[CorrelationResult]:
        correlations: list[CorrelationResult] = []
        for first, second in combinations(entities, 2):
            if first.domain == second.domain:
                continue
            shared = self._shared_indicators(first, second)
            if not shared:
                continue
            pair_score = self._score_correlation(first, second, shared)
            if pair_score < self.min_correlation_score:
                continue
            rationale = self._build_rationale(first, second, shared)
            correlations.append(
                CorrelationResult(
                    source=first.id,
                    target=second.id,
                    shared_attributes=shared,
                    rationale=rationale,
                    score=pair_score,
                    domains=(first.domain, second.domain),
                )
            )
        correlations.sort(key=lambda result: result.score, reverse=True)
        return correlations

    def _detect_patterns(
        self, entities: Sequence[FusionEntity], correlations: Sequence[CorrelationResult]
    ) -> list[FusionPattern]:
        adjacency: defaultdict[str, set[str]] = defaultdict(set)
        for correlation in correlations:
            adjacency[correlation.source].add(correlation.target)
            adjacency[correlation.target].add(correlation.source)

        visited: set[str] = set()
        patterns: list[FusionPattern] = []

        for entity in entities:
            if entity.id in visited:
                continue
            component = self._dfs_component(entity.id, adjacency, visited)
            domains = {self.entities[node].domain for node in component if node in self.entities}
            if {"osint", "finintel", "cyber"}.issubset(domains):
                component_correlations = [
                    corr
                    for corr in correlations
                    if corr.source in component and corr.target in component
                ]
                if not component_correlations:
                    continue
                confidence = mean(corr.score for corr in component_correlations)
                description = (
                    "Linked OSINT collection → FinIntel exposure → Cyber telemetry "
                    "with corroborating indicators"
                )
                patterns.append(
                    FusionPattern(
                        description=description,
                        chain=self._ordered_chain(component),
                        confidence=round(confidence, 4),
                        supporting_links=component_correlations,
                    )
                )
        patterns.sort(key=lambda pattern: pattern.confidence, reverse=True)
        return patterns

    def _ordered_chain(self, component: Iterable[str]) -> list[str]:
        domain_priority = {"osint": 0, "finintel": 1, "cyber": 2}

        def sort_key(node: str) -> tuple[int, str]:
            domain = self.entities.get(node)
            priority = domain_priority.get(domain.domain if domain else None, 99)
            return priority, node

        return sorted(component, key=sort_key)

    def _dfs_component(
        self, start: str, adjacency: Mapping[str, set[str]], visited: set[str]
    ) -> list[str]:
        stack = [start]
        component: list[str] = []
        while stack:
            node = stack.pop()
            if node in visited:
                continue
            visited.add(node)
            component.append(node)
            stack.extend(adjacency.get(node, set()))
        return component

    def _shared_indicators(self, first: FusionEntity, second: FusionEntity) -> set[str]:
        important_keys = {
            "ip",
            "domain",
            "wallet",
            "email",
            "infrastructure",
            "hash",
            "actor",
            "alias",
            "campaign",
        }
        first_values = self._normalized_values(first, important_keys)
        second_values = self._normalized_values(second, important_keys)
        return {
            key
            for key in important_keys
            if first_values.get(key, set()) & second_values.get(key, set())
        }

    def _normalized_values(
        self, entity: FusionEntity, keys: set[str]
    ) -> dict[str, set[str]]:
        normalized: dict[str, set[str]] = {}
        for key in keys:
            raw_value = entity.attributes.get(key)
            if raw_value is None:
                continue
            values: set[str]
            if isinstance(raw_value, MappingABC):
                values = {str(value).lower() for value in raw_value.values()}
            elif isinstance(raw_value, str):
                values = {raw_value.lower()}
            elif isinstance(raw_value, IterableABC):
                values = {str(item).lower() for item in raw_value}
            else:
                values = {str(raw_value).lower()}
            normalized[key] = values
        return normalized

    def _score_correlation(
        self, first: FusionEntity, second: FusionEntity, shared: set[str]
    ) -> float:
        base_confidence = mean([first.confidence, second.confidence])
        coverage = min(1.0, len(shared) * 0.25)
        chain_bonus = 0.1 if {first.domain, second.domain} == {"osint", "finintel"} else 0.0
        chain_bonus += 0.1 if {first.domain, second.domain} == {"finintel", "cyber"} else 0.0
        chain_bonus += 0.15 if {first.domain, second.domain} == {"osint", "cyber"} else 0.0
        score = base_confidence * (0.6 + coverage) + chain_bonus
        return round(_clamp(score, 0.0, 1.0), 4)

    def _build_rationale(
        self, first: FusionEntity, second: FusionEntity, shared: set[str]
    ) -> str:
        attributes_text = ", ".join(sorted(shared))
        return (
            f"Correlated {first.entity_type} ({first.domain}) with {second.entity_type} "
            f"({second.domain}) via {attributes_text} with weighted confidence."
        )


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))
