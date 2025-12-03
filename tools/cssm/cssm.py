"""Canonical Semantic Schema Mapper (CSSM).

The mapper aligns source system schemas with a canonical business ontology and
emits structured artifacts that downstream consumers can reason over without
needing to understand each source individually.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
import pathlib
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from .ontology import CanonicalAttribute, CanonicalOntology, load_ontology
from .embeddings import cosine_similarity, deterministic_embedding


@dataclass(frozen=True)
class RuleMatch:
    """Represents a triggered rule and its contribution to confidence."""

    name: str
    weight: float
    detail: str


@dataclass
class FieldAnnotation:
    """Schema annotation for a source field."""

    source_system: str
    source_table: str
    field_name: str
    field_description: str
    data_type: str
    canonical: CanonicalAttribute
    confidence: float
    rule_matches: Sequence[RuleMatch]
    embedding_similarity: float
    embedding_hints: Sequence[Tuple[str, float]]

    def to_dict(self) -> Dict[str, object]:
        return {
            "source_system": self.source_system,
            "source_table": self.source_table,
            "field_name": self.field_name,
            "field_description": self.field_description,
            "data_type": self.data_type,
            "canonical_target": self.canonical.to_dict(),
            "confidence": round(self.confidence, 3),
            "rule_matches": [
                {"name": match.name, "weight": match.weight, "detail": match.detail}
                for match in self.rule_matches
            ],
            "embedding_similarity": round(self.embedding_similarity, 3),
            "embedding_hints": [
                {"candidate": name, "similarity": round(score, 3)}
                for name, score in self.embedding_hints
            ],
        }


class CanonicalSemanticSchemaMapper:
    """Aligns source schemas with the canonical ontology."""

    def __init__(self, ontology: CanonicalOntology, min_confidence: float = 0.55):
        self.ontology = ontology
        self.min_confidence = min_confidence
        self._canonical_attributes = list(ontology.iter_attributes())

    @classmethod
    def from_path(
        cls, ontology_path: Optional[PathLike] = None, min_confidence: float = 0.55
    ) -> "CanonicalSemanticSchemaMapper":
        path = (
            pathlib.Path(ontology_path)
            if ontology_path is not None
            else pathlib.Path(__file__).parent / "data" / "ontology.json"
        )
        ontology = load_ontology(path)
        return cls(ontology=ontology, min_confidence=min_confidence)

    def map_sources(self, systems: Sequence[Dict[str, object]]) -> Dict[str, object]:
        annotations: List[FieldAnnotation] = []
        for system in sorted(systems, key=lambda s: s["name"]):
            for table in sorted(system.get("tables", []), key=lambda t: t["name"]):
                for field in sorted(table.get("fields", []), key=lambda f: f["name"]):
                    annotation = self._annotate_field(system, table, field)
                    annotations.append(annotation)

        schema_annotations = [annotation.to_dict() for annotation in annotations]
        compatibility_matrix = self._build_compatibility_matrix(annotations)
        migration_aide = self._build_migration_aide(annotations)
        return {
            "schema_annotations": schema_annotations,
            "compatibility_matrix": compatibility_matrix,
            "migration_aide": migration_aide,
        }

    # ------------------------------------------------------------------
    # Annotation logic
    # ------------------------------------------------------------------
    def _annotate_field(
        self, system: Dict[str, object], table: Dict[str, object], field: Dict[str, object]
    ) -> FieldAnnotation:
        source_name = str(field["name"]).strip()
        source_desc = str(field.get("description", "")).strip()
        source_type = str(field.get("data_type", "unknown")).lower()

        best_attr: Optional[CanonicalAttribute] = None
        best_confidence = -1.0
        best_rule_matches: Sequence[RuleMatch] = []
        best_similarity = 0.0
        best_hints: Sequence[Tuple[str, float]] = []

        for candidate in self._canonical_attributes:
            rule_matches = list(self._evaluate_rules(source_name, source_desc, source_type, candidate))
            rule_score = sum(match.weight for match in rule_matches)

            name_embedding = deterministic_embedding(source_name + " " + source_desc)
            candidate_embedding = deterministic_embedding(
                candidate.name + " " + candidate.description
            )
            similarity = cosine_similarity(name_embedding, candidate_embedding)

            # Combine rule and embedding evidence deterministically.
            confidence = self._blend_confidence(rule_score, similarity)

            if confidence > best_confidence:
                best_confidence = confidence
                best_attr = candidate
                best_rule_matches = rule_matches
                best_similarity = similarity

        assert best_attr is not None, "Ontology must provide at least one attribute"

        hints = self._embedding_hints(source_name + " " + source_desc, exclude=best_attr.name)
        final_confidence = max(best_confidence, self.min_confidence if best_rule_matches else best_confidence)

        return FieldAnnotation(
            source_system=str(system["name"]),
            source_table=str(table["name"]),
            field_name=source_name,
            field_description=source_desc,
            data_type=source_type,
            canonical=best_attr,
            confidence=final_confidence,
            rule_matches=best_rule_matches,
            embedding_similarity=best_similarity,
            embedding_hints=hints,
        )

    def _evaluate_rules(
        self,
        source_name: str,
        source_desc: str,
        source_type: str,
        candidate: CanonicalAttribute,
    ) -> Iterable[RuleMatch]:
        norm_source = source_name.lower()
        norm_candidate = candidate.name.lower()
        if norm_source == norm_candidate:
            yield RuleMatch(
                name="EXACT_NAME",
                weight=0.6,
                detail=f"Source field '{source_name}' exactly matches canonical name",
            )

        if norm_source.replace("_", "") == norm_candidate.replace("_", ""):
            yield RuleMatch(
                name="NORMALIZED_NAME",
                weight=0.4,
                detail="Alphanumeric-normalized names are equivalent",
            )

        candidate_tokens = set(norm_candidate.replace("_", " ").split())
        source_tokens = set(
            token for token in norm_source.replace("_", " ").split() if token
        ) | set(token for token in source_desc.lower().split() if token)
        overlap = candidate_tokens & source_tokens
        if overlap:
            yield RuleMatch(
                name="TOKEN_OVERLAP",
                weight=0.2 + 0.05 * len(overlap),
                detail=f"Shared tokens {sorted(overlap)} between source and canonical",
            )

        if candidate.semantic_type in self._semantic_type_aliases().get(source_type, set()):
            yield RuleMatch(
                name="TYPE_SEMANTIC_ALIGNMENT",
                weight=0.3,
                detail=f"Source type '{source_type}' aligns with canonical semantic type '{candidate.semantic_type}'",
            )

        semantic_keywords = self._semantic_keywords().get(candidate.semantic_type, set())
        keyword_overlap = semantic_keywords & source_tokens
        if keyword_overlap:
            yield RuleMatch(
                name="SEMANTIC_KEYWORD",
                weight=0.45,
                detail=f"Semantic cues {sorted(keyword_overlap)} reinforce canonical semantic type",
            )

        if candidate.unit:
            if any("usd" in token for token in source_tokens) and candidate.unit.lower() == "usd":
                yield RuleMatch(
                    name="UNIT_MENTION",
                    weight=0.25,
                    detail="Source description mentions USD aligning with canonical unit",
                )

    def _semantic_type_aliases(self) -> Dict[str, set]:
        return {
            "varchar": {"identifier", "attribute", "contact"},
            "string": {"identifier", "attribute", "contact"},
            "date": {"timestamp"},
            "timestamp": {"timestamp"},
            "datetime": {"timestamp"},
            "numeric": {"amount", "financial"},
            "currency": {"amount", "financial"},
            "decimal": {"amount", "financial"},
        }

    def _semantic_keywords(self) -> Dict[str, set]:
        return {
            "identifier": {"id", "identifier", "key"},
            "timestamp": {"date", "time", "timestamp"},
            "amount": {"amount", "total", "value", "gmv"},
            "financial": {"revenue", "amount", "gmv", "sales"},
            "attribute": {"name", "status", "type"},
            "contact": {"email", "phone"},
        }

    def _blend_confidence(self, rule_score: float, similarity: float) -> float:
        # Cap rule score at 1.0 to keep combined metric in range.
        rule_component = min(rule_score, 1.0)
        # Weighted blend: rules dominate but embeddings provide nuance.
        combined = (0.7 * rule_component) + (0.3 * similarity)
        return min(1.0, combined)

    def _embedding_hints(
        self, source_text: str, exclude: Optional[str] = None
    ) -> Sequence[Tuple[str, float]]:
        source_embedding = deterministic_embedding(source_text)
        scores: List[Tuple[str, float]] = []
        for candidate in self._canonical_attributes:
            if exclude and candidate.name == exclude:
                continue
            candidate_embedding = deterministic_embedding(
                candidate.name + " " + candidate.description
            )
            scores.append(
                (
                    candidate.name,
                    cosine_similarity(source_embedding, candidate_embedding),
                )
            )
        scores.sort(key=lambda item: (-item[1], item[0]))
        return scores[:3]

    # ------------------------------------------------------------------
    # Compatibility matrix generation
    # ------------------------------------------------------------------
    def _build_compatibility_matrix(
        self, annotations: Sequence[FieldAnnotation]
    ) -> List[Dict[str, object]]:
        matrix: List[Dict[str, object]] = []
        annotations = sorted(
            annotations,
            key=lambda ann: (ann.canonical.name, ann.source_system, ann.source_table, ann.field_name),
        )
        for left, right in combinations(annotations, 2):
            if left.source_system == right.source_system:
                continue
            compatible, reason = self._compatibility(left, right)
            matrix.append(
                {
                    "left": self._compatibility_endpoint(left),
                    "right": self._compatibility_endpoint(right),
                    "compatible": compatible,
                    "reason": reason,
                }
            )
        return matrix

    def _compatibility(self, left: FieldAnnotation, right: FieldAnnotation) -> Tuple[bool, str]:
        if left.canonical.name != right.canonical.name:
            return (
                False,
                f"Canonical mismatch: {left.canonical.name} vs {right.canonical.name}",
            )

        if left.canonical.unit != right.canonical.unit:
            return (
                False,
                f"Unit mismatch: {left.canonical.unit or 'none'} vs {right.canonical.unit or 'none'}",
            )

        type_alias = {
            "varchar": "string",
            "string": "string",
            "numeric": "number",
            "currency": "number",
            "decimal": "number",
        }
        left_type = type_alias.get(left.data_type, left.data_type)
        right_type = type_alias.get(right.data_type, right.data_type)
        if left_type != right_type:
            return (False, f"Type mismatch: {left_type} vs {right_type}")

        return (True, "Canonical, unit, and type alignment confirmed")

    def _compatibility_endpoint(self, annotation: FieldAnnotation) -> Dict[str, object]:
        return {
            "system": annotation.source_system,
            "table": annotation.source_table,
            "field": annotation.field_name,
            "canonical": annotation.canonical.name,
            "unit": annotation.canonical.unit,
        }

    # ------------------------------------------------------------------
    # Migration aide
    # ------------------------------------------------------------------
    def _build_migration_aide(self, annotations: Sequence[FieldAnnotation]) -> str:
        sections: Dict[str, List[FieldAnnotation]] = {}
        for annotation in annotations:
            sections.setdefault(annotation.source_system, []).append(annotation)

        lines: List[str] = ["# Canonical Migration Aide", ""]
        lines.append(
            "This aide summarizes the normalization steps required for each source system"
        )
        lines.append("to align with the canonical business ontology.")
        lines.append("")

        for system in sorted(sections):
            lines.append(f"## {system}")
            lines.append("")
            system_annotations = sorted(
                sections[system],
                key=lambda ann: (ann.source_table, ann.field_name),
            )
            for annotation in system_annotations:
                canonical = annotation.canonical
                rule_summary = ", ".join(match.name for match in annotation.rule_matches) or "embedding similarity"
                lines.append(
                    f"- `{annotation.source_table}.{annotation.field_name}` → `{canonical.name}`"
                    f" ({canonical.classification}; confidence {annotation.confidence:.2f})."
                )
                lines.append(
                    f"  - Evidence: {rule_summary}; embedding {annotation.embedding_similarity:.2f}."
                )
                if annotation.canonical.unit and annotation.canonical.unit != annotation.data_type:
                    lines.append(
                        f"  - Normalize units to {annotation.canonical.unit}."
                    )
                if annotation.data_type not in {"varchar", "string", "numeric", "currency", "decimal"}:
                    lines.append(
                        f"  - Review data type '{annotation.data_type}' for compatibility."
                    )
            lines.append("")
        return "\n".join(lines)


def map_sources(
    systems: Sequence[Dict[str, object]],
    ontology_path: Optional[PathLike] = None,
    min_confidence: float = 0.55,
) -> Dict[str, object]:
    mapper = CanonicalSemanticSchemaMapper.from_path(
        ontology_path=ontology_path, min_confidence=min_confidence
    )
    return mapper.map_sources(systems)


PathLike = pathlib.Path | str
