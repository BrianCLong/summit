#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    report_path = root / "artifacts" / "structcorr" / "report.json"
    metrics_path = root / "artifacts" / "structcorr" / "metrics.json"
    drift_path = root / "artifacts" / "structcorr" / "drift.json"

    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {"findings": []}
    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}

    failing_rules = Counter(
        finding["rule"] for finding in report.get("findings", []) if finding.get("severity") == "fail"
    )
    drift_doc = {
        "json_schema_pass_rate": metrics.get("json_schema_pass_rate", 1.0),
        "sql_parse_pass_rate": metrics.get("sql_parse_pass_rate", 1.0),
        "md_table_integrity_rate": metrics.get("md_table_integrity_rate", 1.0),
        "latex_compile_pass_rate": metrics.get("latex_compile_pass_rate", 1.0),
        "top_failing_rules": sorted(failing_rules.items(), key=lambda item: (-item[1], item[0])),
    }

    drift_path.parent.mkdir(parents=True, exist_ok=True)
    drift_path.write_text(json.dumps(drift_doc, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {drift_path}")


if __name__ == "__main__":
    main()
