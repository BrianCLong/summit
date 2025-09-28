"""Diff utilities for RNF bundles."""

from __future__ import annotations

import difflib
from pathlib import Path
from typing import Dict, List

from .utils import read_json


class BundleDiff:
    def __init__(self, lhs: Path, rhs: Path) -> None:
        self.lhs = lhs
        self.rhs = rhs

    def render(self) -> str:
        lhs_manifest = read_json(self.lhs / "manifest.json")
        rhs_manifest = read_json(self.rhs / "manifest.json")
        lhs_cells = {cell["index"]: cell for cell in lhs_manifest.get("cells", [])}
        rhs_cells = {cell["index"]: cell for cell in rhs_manifest.get("cells", [])}
        shared_indices = sorted(set(lhs_cells) | set(rhs_cells))
        diffs: List[str] = []
        for index in shared_indices:
            lhs_cell = lhs_cells.get(index)
            rhs_cell = rhs_cells.get(index)
            if not lhs_cell or not rhs_cell:
                diffs.append(f"Cell {index}: added" if rhs_cell else f"Cell {index}: removed")
                continue
            lhs_path = self.lhs / lhs_cell["artifact"]["path"]
            rhs_path = self.rhs / rhs_cell["artifact"]["path"]
            lhs_payload = read_json(lhs_path)
            rhs_payload = read_json(rhs_path)
            if lhs_payload == rhs_payload:
                continue
            lhs_text = self._pretty(lhs_payload)
            rhs_text = self._pretty(rhs_payload)
            diff = difflib.unified_diff(
                lhs_text.splitlines(),
                rhs_text.splitlines(),
                fromfile=f"lhs cell {index}",
                tofile=f"rhs cell {index}",
                lineterm="",
            )
            diffs.extend(diff)
        return "\n".join(diffs) if diffs else "No differences detected"

    def _pretty(self, payload: Dict) -> str:  # type: ignore[override]
        return read_json_to_text(payload)


def read_json_to_text(payload: Dict) -> str:
    """Return deterministic text from a JSON payload."""
    import json

    return json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True)
