"""Ontology primitives for CSSM."""
from __future__ import annotations

from dataclasses import dataclass
import json
import pathlib
from typing import Dict, Iterable, List, Optional


@dataclass(frozen=True)
class CanonicalAttribute:
    name: str
    description: str
    classification: str
    entity: Optional[str]
    semantic_type: str
    data_type: Optional[str]
    unit: Optional[str] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "classification": self.classification,
            "entity": self.entity,
            "semantic_type": self.semantic_type,
            "data_type": self.data_type,
            "unit": self.unit,
        }


@dataclass
class CanonicalOntology:
    entities: List[Dict[str, object]]
    metrics: List[Dict[str, object]]
    units: List[Dict[str, object]]

    def iter_attributes(self) -> Iterable[CanonicalAttribute]:
        for entity in self.entities:
            for field in entity.get("fields", []):
                yield CanonicalAttribute(
                    name=field["name"],
                    description=field.get("description", ""),
                    classification="entity_field",
                    entity=entity.get("name"),
                    semantic_type=field.get("semantic_type", "attribute"),
                    data_type=field.get("data_type"),
                    unit=field.get("unit"),
                )
        for metric in self.metrics:
            yield CanonicalAttribute(
                name=metric["name"],
                description=metric.get("description", ""),
                classification="metric",
                entity=metric.get("entity"),
                semantic_type=metric.get("semantic_type", "metric"),
                data_type="numeric",
                unit=metric.get("unit"),
            )


def load_ontology(path: pathlib.Path) -> CanonicalOntology:
    content = json.loads(path.read_text())
    return CanonicalOntology(
        entities=content.get("entities", []),
        metrics=content.get("metrics", []),
        units=content.get("units", []),
    )
