from __future__ import annotations

import json
import os
import sys
from datetime import UTC, datetime, timezone
from pathlib import Path

from .adapter_kaggle import load_dataset
from .entity_resolution import EntityResolver
from .scoring import classify_bucket, compute_metrics
from .stop_diagnostics import compute_stop_diagnostics


def main() -> int:
    # Feature flag: off by default.
    enabled = os.getenv("DEEPSEARCHQA_ENABLED", "0") == "1"
    if not enabled:
        print("DeepSearchQA is disabled. Set DEEPSEARCHQA_ENABLED=1 to enable.")
        return 0

    fixture_path = Path(__file__).parent / "fixtures" / "tiny_public_sample.json"
    dataset = load_dataset(fixture_path)

    results = []
    total_metrics = {"precision": 0.0, "recall": 0.0, "f1": 0.0}

    resolver = EntityResolver(enabled=os.getenv("ENTITY_RESOLUTION", "1") == "1")

    for item in dataset:
        # Mocking agent output identical to ground truth for verification
        submitted = item["ground_truth"]

        # Resolve/Dedup
        resolved = resolver.resolve(submitted)

        # Score
        set_submitted = set(resolved)
        set_gt = set(item["ground_truth"])

        m = compute_metrics(set_submitted, set_gt)
        bucket = classify_bucket(set_submitted, set_gt)
        stop_diag = compute_stop_diagnostics(set_submitted, set_gt)

        results.append({
            "id": item["id"],
            "metrics": m,
            "bucket": bucket,
            "diagnostics": stop_diag
        })

        total_metrics["precision"] += m["precision"]
        total_metrics["recall"] += m["recall"]
        total_metrics["f1"] += m["f1"]

    num_items = len(dataset)
    avg_metrics = {k: v / num_items for k, v in total_metrics.items()}

    # Emit evidence
    evidence_dir = Path("evidence/deepsearchqa-run")
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # Determinism: timestamps ONLY in stamp.json
    evidence_id = "EVD-DEEPSEARCHQA-FIXTURES-001"

    report = {
        "evidence_id": evidence_id,
        "summary": "DeepSearchQA Fixtures Run",
        "artifacts": ["fixtures/tiny_public_sample.json"]
    }

    metrics = {
        "evidence_id": evidence_id,
        "metrics": avg_metrics
    }

    # Use UTC for timestamp in stamp.json
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    stamp = {
        "created_at": now,
        "git_commit": os.getenv("GIT_COMMIT", "unknown")
    }

    index = {
        "items": [
            {
                "evidence_id": evidence_id,
                "report": "report.json",
                "metrics": "metrics.json",
                "stamp": "stamp.json"
            }
        ]
    }

    def write_json(p, d):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(d, f, indent=2, sort_keys=True)
            f.write("\n")

    write_json(evidence_dir / "report.json", report)
    write_json(evidence_dir / "metrics.json", metrics)
    write_json(evidence_dir / "stamp.json", stamp)
    write_json(evidence_dir / "index.json", index)

    print(f"Evidence generated in {evidence_dir}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
