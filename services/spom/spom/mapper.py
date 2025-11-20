"""Core mapping engine for SPOM."""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Sequence

from .ml import EmbeddingModel
from .models import FieldObservation, MappingReport, MappingResult, OntologyTag
from .rules import evaluate_rules


SENSITIVITY_BY_CATEGORY: Dict[str, str] = {
    "EMAIL": "medium",
    "PHONE": "high",
    "NAME": "medium",
    "ADDRESS": "medium",
    "IP": "medium",
    "GOV_ID": "high",
    "ACCESS_TOKEN": "critical",
    "API_KEY": "critical",
    "PAYMENT_HINTS": "high",
}

JURISDICTION_HINTS: Dict[str, List[str]] = {
    "GOV_ID": ["us"],
    "PAYMENT_HINTS": ["pci-dss"],
}


class SPOM:
    """Semantic PII Ontology Mapper."""

    def __init__(self, threshold: float = 0.6) -> None:
        self.threshold = threshold
        self.embedding = EmbeddingModel()

    def map_fields(
        self, fields: Sequence[FieldObservation], dataset: str | None = None
    ) -> MappingReport:
        dataset_name = dataset or (fields[0].dataset if fields else "unknown") or "unknown"
        results: List[MappingResult] = []
        for field in fields:
            results.append(self._map_field(field))
        return MappingReport(dataset=dataset_name, results=results)

    def _map_field(self, field: FieldObservation) -> MappingResult:
        matches = evaluate_rules(field)
        scores: Dict[str, float] = defaultdict(float)
        reasoning: Dict[str, List[str]] = defaultdict(list)
        features: Dict[str, Dict[str, float]] = defaultdict(dict)

        for match in matches:
            scores[match.category] += match.weight
            reasoning[match.category].append(f"Rule: {match.reason} (weight {match.weight:.2f})")
            features[match.category][match.feature] = match.weight

        text_for_embeddings = self._build_text(field)
        candidates: Iterable[str]
        if scores:
            candidates = scores.keys()
        else:
            candidates = self.embedding.ontology_space.keys()
        embed_category, embed_score = self.embedding.best_category(text_for_embeddings, candidates)
        if embed_category:
            scores[embed_category] += embed_score * 0.5
            reasoning[embed_category].append(
                f"Embedding similarity {embed_score:.2f} to {embed_category} keywords"
            )
            features[embed_category]["embedding"] = embed_score

        if not scores:
            fallback_tag = OntologyTag(
                label="GENERAL_DATA",
                category="GENERAL_DATA",
                sensitivity="low",
                jurisdictions=[],
            )
            return MappingResult(
                field=field,
                tag=fallback_tag,
                confidence=0.0,
                explanations=["No rules or embeddings matched"],
                evidence={},
            )

        best_category = max(scores, key=scores.get)
        confidence = min(1.0, scores[best_category])
        explanations = reasoning[best_category]
        evidence = {
            "score": scores[best_category],
            "features": features[best_category],
        }

        tag = self._build_tag(best_category, field)
        return MappingResult(
            field=field,
            tag=tag,
            confidence=confidence,
            explanations=explanations,
            evidence=evidence,
        )

    def _build_tag(self, category: str, field: FieldObservation) -> OntologyTag:
        sensitivity = SENSITIVITY_BY_CATEGORY.get(category, "low")
        jurisdictions = list(JURISDICTION_HINTS.get(category, []))
        if category == "GOV_ID" and "ssn" in field.name.lower():
            jurisdictions = ["us"]
        if category == "ADDRESS" and "eu" in (field.description.lower() if field.description else ""):
            jurisdictions.append("gdpr")
        return OntologyTag(
            label=category,
            category=category,
            sensitivity=sensitivity,
            jurisdictions=jurisdictions,
        )

    def _build_text(self, field: FieldObservation) -> str:
        samples = " ".join(field.sample_values[:3])
        return " ".join(filter(None, [field.name, field.description, samples]))
