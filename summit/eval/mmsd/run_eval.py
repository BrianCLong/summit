import datetime
import json
from pathlib import Path


def main() -> None:
    # TODO: dataset adapter for MMSD2.0 once data path is known.
    evidence_id = "EVD-GDCNET-MMSD-EVAL-001"
    out_dir = Path("evidence") / evidence_id
    out_dir.mkdir(parents=True, exist_ok=True)

    report_content = {
        "evidence_id": evidence_id,
        "item": {"arxiv": "2601.20618", "name": "GDCNet"},
        "summary": "Scaffold run (no dataset wired).",
        "artifacts": ["metrics.json", "stamp.json"]
    }
    (out_dir / "report.json").write_text(json.dumps(report_content, indent=2, sort_keys=True))

    metrics_content = {
        "evidence_id": evidence_id,
        "metrics": {"accuracy": None}
    }
    (out_dir / "metrics.json").write_text(json.dumps(metrics_content, indent=2, sort_keys=True))

    stamp_content = {
        "evidence_id": evidence_id,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
    (out_dir / "stamp.json").write_text(json.dumps(stamp_content, indent=2, sort_keys=True))

    print(f"Evidence emitted to {out_dir}")

if __name__ == "__main__":
    main()
