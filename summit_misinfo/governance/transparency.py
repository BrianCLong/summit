from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass
class TransparencyReport:
    run_id: str
    item_slug: str
    detector_versions: dict[str, str]
    thresholds: dict[str, Any]
    false_positive_policy: str
    appeal_url: str
    redaction_proof: bool = True

def generate_report(
    run_id: str,
    item_slug: str,
    detector_versions: dict[str, str],
    thresholds: dict[str, Any]
) -> str: # returns JSON string

    safe_thresholds = _redact(thresholds)

    report = TransparencyReport(
        run_id=run_id,
        item_slug=item_slug,
        detector_versions=detector_versions,
        thresholds=safe_thresholds,
        false_positive_policy="Review within 24h; human-in-the-loop for high-impact.",
        appeal_url="https://summit.internal/appeals",
        redaction_proof=True
    )
    return json.dumps(asdict(report), indent=2)

def _redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        new_obj = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in ("token", "key", "secret", "pii", "password")):
                new_obj[k] = "[REDACTED]"
            else:
                new_obj[k] = _redact(v)
        return new_obj
    elif isinstance(obj, list):
        return [_redact(i) for i in obj]
    else:
        return obj
