import json
from datetime import UTC, timezone
from pathlib import Path
from typing import Any, Dict


def write_compliance_evidence(run_dir: Path, evidence_id: str, findings: dict[str, Any]) -> dict[str, str]:
    run_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "evidence_id": evidence_id,
        "module": "info_integrity",
        "scope": "analysis_only",
        "findings": findings,
        "safety_note": "No targeting, persuasion, or counter-messaging content is generated.",
    }
    metrics = {
        "prohibited_intent_blocks": int(findings.get("prohibited_intent_blocks", 0)),
        "prohibited_field_blocks": int(findings.get("prohibited_field_blocks", 0)),
    }
    from datetime import datetime
    stamp = {
        "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "run_id": run_dir.name
    }

    report_path = run_dir / "report.json"
    metrics_path = run_dir / "metrics.json"
    stamp_path = run_dir / "stamp.json"

    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n")
    stamp_path.write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n")

    # Update evidence/index.json
    root_dir = run_dir.parents[2] # Assuming run_dir is evidence/runs/<run_id>
    index_path = root_dir / "evidence" / "index.json"
    if index_path.exists():
        try:
            index_data = json.loads(index_path.read_text())
            # Check if evidence_id already exists
            items = index_data.get("items", [])
            existing = next((item for item in items if item["evidence_id"] == evidence_id), None)

            new_files = [
                str(report_path.relative_to(root_dir)),
                str(metrics_path.relative_to(root_dir)),
                str(stamp_path.relative_to(root_dir))
            ]

            if existing:
                existing["files"] = sorted(list(set(existing["files"] + new_files)))
            else:
                items.append({
                    "evidence_id": evidence_id,
                    "files": sorted(new_files)
                })
            index_data["items"] = items
            index_path.write_text(json.dumps(index_data, indent=2, sort_keys=True) + "\n")
        except Exception as e:
            print(f"Warning: could not update evidence/index.json: {e}")

    return {
        "report": str(report_path),
        "metrics": str(metrics_path),
        "stamp": str(stamp_path)
    }
