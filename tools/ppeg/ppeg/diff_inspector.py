"""Diff utilities for provenance-aware pipelines."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Mapping, Sequence


@dataclass(frozen=True)
class StepDiff:
    step_id: str
    change_type: str  # "added", "removed", or "modified"
    before_fingerprint: Dict[str, str] | None
    after_fingerprint: Dict[str, str] | None


def _load_provenance(path: Path | str) -> List[Mapping[str, object]]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(payload, list):  # pragma: no cover - defensive guard
        raise ValueError("Provenance files must contain a list of steps.")
    return [entry for entry in payload if isinstance(entry, Mapping)]


def _fingerprint_map(entry: Mapping[str, object]) -> Dict[str, str]:
    outputs = entry.get("outputs", {})
    result: Dict[str, str] = {}
    if isinstance(outputs, Mapping):
        for name, payload in outputs.items():
            if isinstance(payload, Mapping):
                fingerprint = payload.get("fingerprint")
                if isinstance(fingerprint, str):
                    result[str(name)] = fingerprint
    return result


def diff_provenance(before: Path | str, after: Path | str) -> List[StepDiff]:
    """Compare two provenance files and emit per-step diffs."""

    before_entries = {entry.get("step_id"): entry for entry in _load_provenance(before)}
    after_entries = {entry.get("step_id"): entry for entry in _load_provenance(after)}

    diffs: List[StepDiff] = []
    for step_id in sorted(set(before_entries) | set(after_entries)):
        before_entry = before_entries.get(step_id)
        after_entry = after_entries.get(step_id)
        if before_entry and not after_entry:
            diffs.append(
                StepDiff(
                    step_id=str(step_id),
                    change_type="removed",
                    before_fingerprint=_fingerprint_map(before_entry),
                    after_fingerprint=None,
                )
            )
            continue
        if after_entry and not before_entry:
            diffs.append(
                StepDiff(
                    step_id=str(step_id),
                    change_type="added",
                    before_fingerprint=None,
                    after_fingerprint=_fingerprint_map(after_entry),
                )
            )
            continue
        assert before_entry and after_entry  # for type checkers
        before_fp = _fingerprint_map(before_entry)
        after_fp = _fingerprint_map(after_entry)
        if before_fp != after_fp:
            diffs.append(
                StepDiff(
                    step_id=str(step_id),
                    change_type="modified",
                    before_fingerprint=before_fp,
                    after_fingerprint=after_fp,
                )
            )
    return diffs


def render_diff_report(diffs: Sequence[StepDiff]) -> str:
    if not diffs:
        return "No transform changes detected."
    lines: List[str] = ["Detected transform changes:"]
    for diff in diffs:
        if diff.change_type == "modified":
            lines.append(
                f"  • {diff.step_id}: fingerprint {diff.before_fingerprint} → {diff.after_fingerprint}"
            )
        elif diff.change_type == "added":
            lines.append(f"  • {diff.step_id}: added with fingerprint {diff.after_fingerprint}")
        else:
            lines.append(f"  • {diff.step_id}: removed (previous fingerprint {diff.before_fingerprint})")
    return "\n".join(lines)


__all__ = ["StepDiff", "diff_provenance", "render_diff_report"]
