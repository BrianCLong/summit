from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from itertools import combinations
from statistics import mean, pstdev
from typing import Iterable


@dataclass(frozen=True)
class EvidenceArtifact:
    """Atomic piece of digital evidence or forensic artifact."""

    id: str
    category: str
    risk_score: float
    signals: list[str]
    attributes: dict[str, float | str] = field(default_factory=dict)
    provenance: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Relationship:
    """Directed relationship inferred between two artifacts."""

    source: str
    target: str
    weight: float
    rationale: str


@dataclass(frozen=True)
class EvidenceAnalysisReport:
    """Structured output of an evidence analysis pipeline."""

    anomalies: list[EvidenceArtifact]
    pattern_signatures: dict[str, list[str]]
    relationships: list[Relationship]
    classifications: dict[str, str]
    tags: dict[str, list[str]]


class EvidenceAnalysisPipeline:
    """Pipeline that automates evidence analysis and tagging."""

    def __init__(self, anomaly_sigma: float = 1.2, shared_signal_weight: float = 0.35) -> None:
        self.anomaly_sigma = anomaly_sigma
        self.shared_signal_weight = shared_signal_weight

    def analyze(self, artifacts: Iterable[EvidenceArtifact]) -> EvidenceAnalysisReport:
        artifact_list = list(artifacts)
        anomalies = self._detect_anomalies(artifact_list)
        patterns = self._recognize_patterns(artifact_list)
        relationships = self._infer_relationships(artifact_list)
        classifications = self._classify_artifacts(artifact_list)
        tags = self._tag_evidence(artifact_list, classifications, relationships, anomalies)
        return EvidenceAnalysisReport(
            anomalies=anomalies,
            pattern_signatures=patterns,
            relationships=relationships,
            classifications=classifications,
            tags=tags,
        )

    def _detect_anomalies(self, artifacts: list[EvidenceArtifact]) -> list[EvidenceArtifact]:
        if not artifacts:
            return []

        risk_scores = [artifact.risk_score for artifact in artifacts]
        risk_mean = mean(risk_scores)
        risk_stdev = pstdev(risk_scores) if len(risk_scores) > 1 else 0.0
        attribute_stats = self._attribute_stats(artifacts)

        anomalies: list[EvidenceArtifact] = []
        for artifact in artifacts:
            z_score = (artifact.risk_score - risk_mean) / risk_stdev if risk_stdev else 0.0
            feature_outlier = self._has_outlier_feature(artifact, attribute_stats)
            if z_score >= self.anomaly_sigma or feature_outlier:
                anomalies.append(artifact)
        return sorted(anomalies, key=lambda item: item.risk_score, reverse=True)

    def _attribute_stats(self, artifacts: list[EvidenceArtifact]) -> dict[str, tuple[float, float]]:
        attribute_values: dict[str, list[float]] = defaultdict(list)
        for artifact in artifacts:
            for name, value in artifact.attributes.items():
                if isinstance(value, (int, float)):
                    attribute_values[name].append(float(value))

        attribute_stats: dict[str, tuple[float, float]] = {}
        for name, values in attribute_values.items():
            attribute_stats[name] = (mean(values), pstdev(values) if len(values) > 1 else 0.0)
        return attribute_stats

    def _has_outlier_feature(
        self, artifact: EvidenceArtifact, attribute_stats: dict[str, tuple[float, float]]
    ) -> bool:
        for name, value in artifact.attributes.items():
            if not isinstance(value, (int, float)):
                continue
            if name not in attribute_stats:
                continue
            attribute_mean, attribute_stdev = attribute_stats[name]
            if attribute_stdev == 0.0:
                continue
            z_score = (float(value) - attribute_mean) / attribute_stdev
            if z_score >= self.anomaly_sigma:
                return True
        return False

    def _recognize_patterns(self, artifacts: list[EvidenceArtifact]) -> dict[str, list[str]]:
        patterns: dict[str, list[str]] = {}
        category_signals: dict[str, Counter[str]] = defaultdict(Counter)
        for artifact in artifacts:
            category_signals[artifact.category].update(artifact.signals)
        for category, counter in category_signals.items():
            top_signals = [signal for signal, _ in counter.most_common(3)]
            patterns[category] = top_signals
        return patterns

    def _infer_relationships(self, artifacts: list[EvidenceArtifact]) -> list[Relationship]:
        relationships: list[Relationship] = []
        for first, second in combinations(artifacts, 2):
            shared_signals = set(first.signals).intersection(second.signals)
            if not shared_signals:
                continue
            average_risk = mean([first.risk_score, second.risk_score])
            weight = round(len(shared_signals) * self.shared_signal_weight + average_risk, 3)
            rationale = (
                f"Shared signals {sorted(shared_signals)} with blended risk {average_risk:.2f}."
            )
            relationships.append(
                Relationship(source=first.id, target=second.id, weight=weight, rationale=rationale)
            )
            relationships.append(
                Relationship(source=second.id, target=first.id, weight=weight, rationale=rationale)
            )
        return sorted(relationships, key=lambda rel: rel.weight, reverse=True)

    def _classify_artifacts(self, artifacts: list[EvidenceArtifact]) -> dict[str, str]:
        classifications: dict[str, str] = {}
        for artifact in artifacts:
            if artifact.risk_score >= 0.8:
                label = "priority-threat-surface"
            elif artifact.category.lower() in {"network", "endpoint"}:
                label = "infrastructure-trace"
            elif "credential" in (signal.lower() for signal in artifact.signals):
                label = "credential-abuse"
            else:
                label = "contextual-artifact"
            classifications[artifact.id] = label
        return classifications

    def _tag_evidence(
        self,
        artifacts: list[EvidenceArtifact],
        classifications: dict[str, str],
        relationships: list[Relationship],
        anomalies: list[EvidenceArtifact],
    ) -> dict[str, list[str]]:
        tags: dict[str, list[str]] = {}
        anomalous_ids = {artifact.id for artifact in anomalies}
        relationship_map: dict[str, list[Relationship]] = defaultdict(list)
        for relationship in relationships:
            relationship_map[relationship.source].append(relationship)

        for artifact in artifacts:
            artifact_tags: list[str] = [classifications.get(artifact.id, "contextual-artifact")]
            if artifact.id in anomalous_ids:
                artifact_tags.append("anomaly")
            if len(set(artifact.signals)) > 2:
                artifact_tags.append("multi-signal-correlated")
            if relationship_map.get(artifact.id):
                artifact_tags.append("linked-evidence")
            if artifact.risk_score >= 0.9:
                artifact_tags.append("critical")
            if any("malware" in signal.lower() for signal in artifact.signals):
                artifact_tags.append("malware-trace")
            tags[artifact.id] = artifact_tags
        return tags
