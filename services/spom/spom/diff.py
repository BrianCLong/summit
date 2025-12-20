"""Diffing utilities for SPOM reports."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from .models import MappingReport, MappingResult


@dataclass
class DiffEntry:
    field: str
    from_tag: Optional[str]
    to_tag: Optional[str]
    from_confidence: float
    to_confidence: float
    explanation: str


@dataclass
class DiffReport:
    dataset: str
    changes: List[DiffEntry]

    def as_dict(self) -> Dict[str, Dict[str, object]]:
        return {
            entry.field: {
                "from": entry.from_tag,
                "to": entry.to_tag,
                "from_confidence": entry.from_confidence,
                "to_confidence": entry.to_confidence,
                "explanation": entry.explanation,
            }
            for entry in self.changes
        }


def diff_reports(before: MappingReport, after: MappingReport) -> DiffReport:
    """Compute diff between two mapping reports."""

    before_index = before.as_index()
    after_index = after.as_index()
    fields = set(before_index) | set(after_index)
    changes: List[DiffEntry] = []

    for field_name in sorted(fields):
        previous: MappingResult | None = before_index.get(field_name)
        current: MappingResult | None = after_index.get(field_name)

        previous_tag = previous.tag.label if previous else None
        current_tag = current.tag.label if current else None

        if previous_tag == current_tag:
            continue

        explanation = _build_diff_explanation(previous, current)
        changes.append(
            DiffEntry(
                field=field_name,
                from_tag=previous_tag,
                to_tag=current_tag,
                from_confidence=previous.confidence if previous else 0.0,
                to_confidence=current.confidence if current else 0.0,
                explanation=explanation,
            )
        )

    return DiffReport(dataset=after.dataset or before.dataset, changes=changes)


def _build_diff_explanation(
    previous: MappingResult | None, current: MappingResult | None
) -> str:
    if previous and current:
        return (
            "Tag changed from "
            f"{previous.tag.summary()}"
            f" to {current.tag.summary()}"
        )
    if previous and not current:
        return "Field removed from dataset"
    if current and not previous:
        return "New field detected"
    return "No change"
