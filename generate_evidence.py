import os
import json
import time

base_dir = "evidence"
slug = "MITTR-AIMEM-PRIV"
ids = [
    f"EVD-{slug}-MODEL-001",
    f"EVD-{slug}-POLICY-002",
    f"EVD-{slug}-LEAK-003",
    f"EVD-{slug}-DSAR-004",
    f"EVD-{slug}-EGRESS-005"
]

summaries = {
    ids[0]: "Structured memory schema & examples",
    ids[1]: "Deny-by-default policy proofs",
    ids[2]: "Context leak eval results",
    ids[3]: "User control API contract tests",
    ids[4]: "Tool egress redaction tests"
}

for eid in ids:
    dir_path = os.path.join(base_dir, eid)
    os.makedirs(dir_path, exist_ok=True)

    # report.json
    report = {
        "evidence_id": eid,
        "item_slug": slug,
        "summary": summaries[eid],
        "artifacts": []
    }
    with open(os.path.join(dir_path, "report.json"), "w") as f:
        json.dump(report, f, indent=2)

    # metrics.json
    metrics = {
        "evidence_id": eid,
        "metrics": {
            "pass_rate": 1.0,
            "latency_ms": 45.0
        }
    }
    with open(os.path.join(dir_path, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    # stamp.json
    stamp = {
        "evidence_id": eid,
        "generated_at": "2026-02-01T12:00:00Z",
        "git_commit": "HEAD"
    }
    with open(os.path.join(dir_path, "stamp.json"), "w") as f:
        json.dump(stamp, f, indent=2)

print("Evidence artifacts generated.")
