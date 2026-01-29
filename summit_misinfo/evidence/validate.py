from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import jsonschema

# Robust path resolution relative to this file
# summit_misinfo/evidence/validate.py -> .../summit_misinfo/evidence -> .../summit_misinfo -> .../root
SCHEMA_DIR = Path(__file__).resolve().parents[2] / "evidence" / "schemas"

def _load(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))

def validate_evidence_dir(evidence_dir: Path) -> None:
    """
    Deny-by-default: raises on any schema mismatch or missing file.
    Timestamps are allowed ONLY in stamp.json.
    """
    if not evidence_dir.exists():
        raise FileNotFoundError(f"Evidence directory not found: {evidence_dir}")

    index_path = evidence_dir / "index.json"
    if not index_path.exists():
        raise FileNotFoundError(f"Missing index.json in {evidence_dir}")

    index = _load(index_path)
    jsonschema.validate(index, _load(SCHEMA_DIR / "index.schema.json"))

    for name, schema_file in [
        ("report.json", "report.schema.json"),
        ("metrics.json", "metrics.schema.json"),
        ("stamp.json", "stamp.schema.json"),
    ]:
        file_path = evidence_dir / name
        if not file_path.exists():
             raise FileNotFoundError(f"Missing {name} in {evidence_dir}")
        obj = _load(file_path)
        jsonschema.validate(obj, _load(SCHEMA_DIR / schema_file))

    # Bias Audit Gate
    if os.environ.get("BIAS_AUDIT_REQUIRED", "1") == "1":
        metrics_path = evidence_dir / "metrics.json"
        if metrics_path.exists():
            metrics = _load(metrics_path)
            bias = metrics.get("bias", {})
            missing = []
            for k in ["by_language", "by_region", "by_demographic_proxy"]:
                if k not in bias:
                    missing.append(k)
            if missing:
                raise ValueError(f"Bias audit failed: missing keys in metrics.bias: {missing}")
