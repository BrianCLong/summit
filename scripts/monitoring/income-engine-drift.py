"""Weekly drift checker for income engine artifacts."""

import json
import re
from pathlib import Path


def main() -> int:
    report_path = Path("report.json")
    metrics_path = Path("metrics.json")

    if not report_path.exists() or not metrics_path.exists():
        raise FileNotFoundError("report.json and metrics.json must exist in cwd")

    report = json.loads(report_path.read_text(encoding="utf-8"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))

    evidence_id = report.get("evidence_id", "")
    if re.fullmatch(r"EVID-INCOME-\d{8}-[a-f0-9]{10}", evidence_id) is None:
        raise ValueError("Evidence ID format violation")

    recurrence = metrics.get("recurrence_score", 0)
    simplicity = metrics.get("simplicity_score", 0)
    if simplicity - recurrence > 0.15:
        raise ValueError("Simplicity score inflation detected")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
