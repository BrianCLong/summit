import datetime
import json
import os
from pathlib import Path

from summit.eval.mmsd.dataset import MMSD2Dataset


def main() -> None:
    evidence_id = "EVD-GDCNET-MMSD-EVAL-001"
    out_dir = Path("evidence") / evidence_id
    out_dir.mkdir(parents=True, exist_ok=True)

    dataset_dir = os.environ.get("MMSD_DATASET_DIR")
    summary = "Scaffold run (no dataset wired)."
    dataset_stats = {}

    if dataset_dir:
        try:
            print(f"Loading dataset from {dataset_dir}...")
            dataset = MMSD2Dataset(dataset_dir, split="test")
            summary = f"Dataset loaded from {dataset_dir}. Samples: {len(dataset)}."
            dataset_stats = {
                "dataset_path": dataset_dir,
                "sample_count": len(dataset),
                "split": "test"
            }
        except Exception as e:
            summary = f"Failed to load dataset from {dataset_dir}: {e}"
            print(summary)

    report_content = {
        "evidence_id": evidence_id,
        "item": {"arxiv": "2601.20618", "name": "GDCNet"},
        "summary": summary,
        "dataset_stats": dataset_stats,
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
