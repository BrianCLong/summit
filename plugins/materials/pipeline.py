from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from .codec import decode_structure, encode_structure
from .validators import validate_invariants


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def redesign(structure_text: str, run_id: str) -> dict:
    if os.getenv("SUMMIT_MATERIALS_REDESIGN", "0") != "1":
        return {"accepted": [], "rejected": [{"reason": "feature_flag_off"}]}

    try:
        obj = decode_structure(structure_text)
        canon = encode_structure(obj)
        issues = validate_invariants(obj)
    except Exception as e:
        return {"accepted": [], "rejected": [{"reason": f"invalid_input: {str(e)}"}]}

    out_dir = Path("evidence") / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Basic evidence pack
    report = {
        "run_id": run_id,
        "inputs": {"structure_sha": _sha(structure_text)},
        "validators": {"issues": issues},
        "outputs": {
            "accepted": [],
            "rejected": [{"reason": "deny_by_default_no_strategy"}]
        },
        "codec": {"canonical_sha": _sha(canon)}
    }

    # In a real scenario, we would have logic here to generate candidates
    # For now, deny-by-default means we output nothing accepted.

    (out_dir / "report.json").write_text(json.dumps(report, indent=2, sort_keys=True))
    (out_dir / "metrics.json").write_text(json.dumps({"accepted": 0, "rejected": 1}, indent=2, sort_keys=True))
    (out_dir / "stamp.json").write_text(json.dumps({"created_at": None, "git_sha": None}, indent=2, sort_keys=True))

    return report
