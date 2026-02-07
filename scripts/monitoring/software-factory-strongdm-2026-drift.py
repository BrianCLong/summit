#!/usr/bin/env python3
import json
import os
import pathlib
import sys
from collections import defaultdict

def load_reports(root: pathlib.Path) -> list[dict]:
    reports = []
    evidence_root = root / "artifacts" / "evidence"
    if not evidence_root.exists():
        return reports

    for path in evidence_root.rglob("report.json"):
        try:
            with path.open("r", encoding="utf-8") as handle:
                report = json.load(handle)
            report["_path"] = str(path)
            reports.append(report)
        except json.JSONDecodeError:
            continue
    return reports


def summarize_reports(reports: list[dict]) -> dict:
    summary = {
        "suite_count": 0,
        "suites": {},
        "drift_detected": False,
        "reasons": [],
    }
    if not reports:
        summary["reasons"].append("no_reports_found")
        return summary

    grouped: dict[str, list[dict]] = defaultdict(list)
    for report in reports:
        suite = report.get("suite", "unknown")
        grouped[suite].append(report)

    summary["suite_count"] = len(grouped)
    for suite, suite_reports in grouped.items():
        satisfaction_values = [r.get("satisfaction", 0) for r in suite_reports]
        rubric_hashes = {r.get("rubric_hash") for r in suite_reports if r.get("rubric_hash")}
        model_ids = {r.get("model_id") for r in suite_reports if r.get("model_id")}
        twin_hashes = {r.get("twin_hash") for r in suite_reports if r.get("twin_hash")}

        suite_summary = {
            "report_count": len(suite_reports),
            "satisfaction_min": min(satisfaction_values) if satisfaction_values else 0,
            "satisfaction_max": max(satisfaction_values) if satisfaction_values else 0,
            "rubric_hashes": sorted(rubric_hashes),
            "model_ids": sorted(model_ids),
            "twin_hashes": sorted(twin_hashes),
        }

        if len(rubric_hashes) > 1:
            summary["drift_detected"] = True
            summary["reasons"].append(f"rubric_hash_drift:{suite}")
        if len(model_ids) > 1:
            summary["drift_detected"] = True
            summary["reasons"].append(f"model_id_drift:{suite}")
        if len(twin_hashes) > 1:
            summary["drift_detected"] = True
            summary["reasons"].append(f"twin_hash_drift:{suite}")

        summary["suites"][suite] = suite_summary

    return summary


def main() -> int:
    root = pathlib.Path.cwd()
    reports = load_reports(root)
    summary = summarize_reports(reports)

    out_dir = root / "artifacts" / "drift"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_name = os.getenv("DRIFT_REPORT_NAME", "report.json")
    out_path = out_dir / report_name
    with out_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2, sort_keys=True)
        handle.write("\n")

    if summary["drift_detected"]:
        print("FAIL: Software factory drift detected.")
        return 1

    print("SUCCESS: No software factory drift detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
