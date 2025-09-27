"""Shared models for SPOM."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class FieldObservation(BaseModel):
    """Represents a schema field observed in a dataset."""

    name: str
    data_type: str = "string"
    description: str = ""
    sample_values: List[str] = Field(default_factory=list, alias="sampleValues")
    constraints: Dict[str, Any] = Field(default_factory=dict)
    dataset: Optional[str] = None

    @field_validator("sample_values", mode="before")
    @classmethod
    def _coerce_values(cls, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value]
        return [str(value)]

    model_config = {
        "populate_by_name": True,
        "str_strip_whitespace": True,
    }


class OntologyTag(BaseModel):
    """Represents a PII ontology tag."""

    label: str
    category: str
    sensitivity: str
    jurisdictions: List[str] = Field(default_factory=list)

    def summary(self) -> str:
        jurisdictions = ", ".join(self.jurisdictions) if self.jurisdictions else "global"
        return f"{self.category} ({self.sensitivity}, {jurisdictions})"


class MappingResult(BaseModel):
    """Mapping outcome for a single field."""

    field: FieldObservation
    tag: OntologyTag
    confidence: float
    explanations: List[str]
    evidence: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def _clamp_confidence(cls, value: float) -> float:
        return max(0.0, min(1.0, value))

    def concise_explanation(self) -> str:
        return "; ".join(self.explanations)


class MappingReport(BaseModel):
    """Collection of mapping results for a dataset."""

    dataset: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    results: List[MappingResult]

    def as_index(self) -> Dict[str, MappingResult]:
        return {result.field.name: result for result in self.results}

    def top_hits(self, threshold: float = 0.6) -> List[MappingResult]:
        return [result for result in self.results if result.confidence >= threshold]
