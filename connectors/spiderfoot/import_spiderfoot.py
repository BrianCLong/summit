"""
Import SpiderFoot JSON export and normalize into Summit OsintEvent records.
Clean-room: no SpiderFoot code reuse; treat export as external input.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class OsintEvent:
    type: str
    value: str
    source_module: str | None = None
    confidence: float | None = None

def load_export(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))

def normalize(export: dict[str, Any]) -> list[OsintEvent]:
    # ASSUMPTION: export contains a list of results. Validation tightened in later PR.
    results = export.get("results") or []
    out: list[OsintEvent] = []
    for r in results:
        out.append(
            OsintEvent(
                type=str(r.get("type", "UNKNOWN")),
                value=str(r.get("data", "")),
                source_module=r.get("module"),
                confidence=r.get("confidence"),
            )
        )
    return out

def write_normalized(events: Iterable[OsintEvent], out_path: str) -> None:
    payload = [e.__dict__ for e in events]
    Path(out_path).write_text(json.dumps(payload, sort_keys=True, indent=2), encoding="utf-8")
