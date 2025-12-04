"""Case-scoped reporting utilities for IntelGraph investigations."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping


@dataclass(frozen=True)
class CaseStep:
    """Single processing step within a case manifest."""

    op: str
    model: str
    config_checksum: str

    def __post_init__(self) -> None:
        op = self._require_non_empty(self.op, "op")
        model = self._require_non_empty(self.model, "model")
        checksum = self._require_non_empty(self.config_checksum, "configChecksum")
        object.__setattr__(self, "op", op)
        object.__setattr__(self, "model", model)
        object.__setattr__(self, "config_checksum", checksum)

    @staticmethod
    def _require_non_empty(value: Any, field_name: str) -> str:
        if not isinstance(value, str):
            raise ValueError(f"Step field '{field_name}' must be a string")
        trimmed = value.strip()
        if not trimmed:
            raise ValueError(f"Step field '{field_name}' cannot be empty")
        return trimmed

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "CaseStep":
        if not isinstance(data, Mapping):
            raise ValueError("Each step entry must be a mapping")
        return cls(
            op=data.get("op"),
            model=data.get("model"),
            config_checksum=data.get("configChecksum"),
        )


@dataclass(frozen=True)
class CaseManifest:
    """Immutable representation of a case manifest."""

    case_id: str
    root_hash: str
    steps: list[CaseStep]

    def __post_init__(self) -> None:
        case_id = self._require_non_empty(self.case_id, "caseId")
        root_hash = self._require_non_empty(self.root_hash, "root")
        object.__setattr__(self, "case_id", case_id)
        object.__setattr__(self, "root_hash", root_hash)

    @staticmethod
    def _require_non_empty(value: Any, field_name: str) -> str:
        if not isinstance(value, str):
            raise ValueError(f"Manifest field '{field_name}' must be a string")
        trimmed = value.strip()
        if not trimmed:
            raise ValueError(f"Manifest field '{field_name}' cannot be empty")
        return trimmed

    @property
    def step_count(self) -> int:
        return len(self.steps)


def load_case_manifest(path: Path) -> CaseManifest:
    """Load a case manifest from disk and validate required fields."""

    if not path.exists():
        raise FileNotFoundError(f"Manifest file not found: {path}")

    try:
        raw_data: Any = json.loads(path.read_text())
    except json.JSONDecodeError as exc:  # pragma: no cover - exercised via ValueError path
        raise ValueError(f"Invalid JSON in manifest: {exc}") from exc

    if not isinstance(raw_data, Mapping):
        raise ValueError("Manifest must decode to a mapping")

    missing_fields = [key for key in ("caseId", "root") if key not in raw_data]
    if missing_fields:
        raise ValueError(f"Manifest missing required identifiers: {', '.join(missing_fields)}")

    steps_raw = raw_data.get("steps", [])
    if not isinstance(steps_raw, list):
        raise ValueError("Manifest 'steps' must be a list")

    steps: list[CaseStep] = [CaseStep.from_dict(step) for step in steps_raw]

    return CaseManifest(
        case_id=raw_data["caseId"],
        root_hash=raw_data["root"],
        steps=steps,
    )


def build_cypher_preview(manifest: CaseManifest) -> list[dict[str, str | int]]:
    """Construct auditable Cypher/SQL previews for the investigation."""

    return [
        {
            "query": "MERGE (c:Case {id: $caseId}) SET c.root_hash = $root",
            "estimated_rows": 1,
            "estimated_cost": "O(1)",
        },
        {
            "query": (
                "UNWIND $steps AS step MERGE (c:Case {id: $caseId})"
                "-[:INCLUDES {op: step.op, model: step.model, checksum: step.config_checksum}]"
                "->(:PipelineStep {op: step.op, model: step.model})"
            ),
            "estimated_rows": manifest.step_count,
            "estimated_cost": "O(n) where n=steps",
        },
        {
            "query": (
                "MATCH (c:Case {id: $caseId})-[:INCLUDES]->(s:PipelineStep) "
                "RETURN s.op AS operation, s.model AS model, s.checksum AS checksum"
            ),
            "estimated_rows": manifest.step_count,
            "estimated_cost": "O(n) where n=steps",
        },
    ]


def build_results_table(manifest: CaseManifest) -> list[dict[str, str | int]]:
    """Summarize manifest steps for reporting tables."""

    results: list[dict[str, str | int]] = []
    for index, step in enumerate(manifest.steps, start=1):
        results.append(
            {
                "step": index,
                "operation": step.op,
                "model": step.model,
                "config_checksum": step.config_checksum,
            }
        )
    return results


def build_hypotheses(manifest: CaseManifest) -> list[dict[str, str]]:
    """Generate competing hypotheses about case integrity."""

    if not manifest.steps:
        return [
            {
                "claim": "Pipeline is undefined due to missing steps.",
                "confidence": "low",
                "evidence": "No steps present; cannot evaluate integrity.",
                "unknowns": "Missing manifest steps and checksums.",
            }
        ]

    ingest_focus = manifest.steps[0]
    tail_focus = manifest.steps[-1]
    return [
        {
            "claim": "Chain-of-custody is intact across all recorded steps.",
            "confidence": "medium",
            "evidence": (
                f"Root hash {manifest.root_hash} anchors {manifest.step_count} steps, "
                f"starting with {ingest_focus.op}/{ingest_focus.model}."
            ),
            "unknowns": "External verification of hashes and warrants not yet attached.",
        },
        {
            "claim": "Later-stage models may drift without additional checks.",
            "confidence": "low",
            "evidence": (
                f"Final step {tail_focus.op}/{tail_focus.model} lacks downstream validation."
            ),
            "unknowns": "Need precision/recall metrics and cross-tenant policy labels.",
        },
    ]


def build_graphrag_summary(manifest: CaseManifest) -> str:
    """Produce a short rationale summary suitable for GraphRAG nodes."""

    operations = ", ".join(f"{step.op}:{step.model}" for step in manifest.steps)
    if not operations:
        operations = "none recorded"
    return (
        f"Case {manifest.case_id} anchors {manifest.step_count} pipeline steps (root={manifest.root_hash}), "
        f"capturing operations: {operations}. Integrity hinges on preserving checksums and hash continuity."
    )
