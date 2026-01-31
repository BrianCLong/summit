from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict


@dataclass(frozen=True)
class EvidenceStamp:
    created_at: str  # ISO8601; timestamps must live ONLY here
    run_id: str

def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def init_evidence_dir(out_dir: Path, *, stamp: EvidenceStamp) -> None:
    write_json(out_dir / "stamp.json", asdict(stamp))
    write_json(out_dir / "report.json", {"summary": "", "artifacts": []})
    write_json(out_dir / "metrics.json", {"metrics": {}})
    write_json(out_dir / "index.json", {"evidence": {}})
