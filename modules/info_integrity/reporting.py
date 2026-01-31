import json
from datetime import timezone, datetime
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

    stamp = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
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
            evidence_map = index_data.get("evidence", {})

            existing = evidence_map.get(evidence_id, {})

            # Prepare new file paths relative to root
            new_files_map = {
                "report": str(report_path.relative_to(root_dir)),
                "metrics": str(metrics_path.relative_to(root_dir)),
                "stamp": str(stamp_path.relative_to(root_dir))
            }

            # Update existing entry with new paths (merging)
            existing.update(new_files_map)

            # Write back to map
            evidence_map[evidence_id] = existing
            index_data["evidence"] = evidence_map

            index_path.write_text(json.dumps(index_data, indent=2, sort_keys=True) + "\n")
        except Exception as e:
            print(f"Warning: could not update evidence/index.json: {e}")

    return {
        "report": str(report_path),
        "metrics": str(metrics_path),
        "stamp": str(stamp_path)
    }
