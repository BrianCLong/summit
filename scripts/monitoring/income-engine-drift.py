"""Weekly drift detector for Income Engine outputs."""

from __future__ import annotations

import json
import re
from pathlib import Path

EVIDENCE_ID_RE = re.compile(r"^EVID-INCOME-[0-9]{8}-[0-9a-f]{12}$")


def detect_drift(baseline: dict, current: dict) -> dict:
    baseline_value = float(baseline["projection"]["projected_revenue"])
    current_value = float(current["projection"]["projected_revenue"])
    if baseline_value == 0:
        projection_drift = 0.0
    else:
        projection_drift = abs(current_value - baseline_value) / baseline_value

    simplicity_inflation = float(current["metrics"]["simplicity_score"]) - float(
        baseline["metrics"]["simplicity_score"]
    )

    return {
        "projection_drift": round(projection_drift, 4),
        "projection_drift_exceeds_10pct": projection_drift > 0.10,
        "simplicity_score_inflation": round(simplicity_inflation, 4),
        "simplicity_inflation_flag": simplicity_inflation > 0.10,
        "evidence_id_valid": bool(EVIDENCE_ID_RE.match(current["report"]["evidence_id"])),
    }


def main() -> None:
    baseline = json.loads(Path("artifacts/income-engine/baseline.json").read_text(encoding="utf-8"))
    current = json.loads(Path("artifacts/income-engine/current.json").read_text(encoding="utf-8"))
    result = detect_drift(baseline, current)
    Path("artifacts/income-engine/drift_report.json").write_text(
        json.dumps(result, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
