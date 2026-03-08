import argparse
import hashlib
import json
import os
import sys
from datetime import UTC, datetime, timezone
from typing import Any, Dict, List

from summit.slopguard.policy import SlopDecision, evaluate_artifact

EXCEPTION_LEDGER = "governance/overrides/slopguard_exceptions.jsonl"

def redact_dict(data: dict[str, Any], never_log_fields: list[str]) -> dict[str, Any]:
    """Redacts sensitive fields from a dictionary."""
    redacted = {}
    for k, v in data.items():
        if any(field.lower() in k.lower() for field in never_log_fields):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v, never_log_fields)
        elif isinstance(v, list):
            redacted[k] = [redact_dict(i, never_log_fields) if isinstance(i, dict) else i for i in v]
        else:
            redacted[k] = v
    return redacted

def write_evidence(evd_id: str, area: str, summary: str, details: dict[str, Any], metrics: dict[str, Any], never_log_fields: list[str]):
    """Writes standard evidence artifacts with redaction and determinism."""
    base_path = f"evidence/slopguard/{area}"
    os.makedirs(base_path, exist_ok=True)

    redacted_details = redact_dict(details, never_log_fields)
    redacted_metrics = redact_dict(metrics, never_log_fields)

    # report.json
    report = {
        "evidence_id": evd_id,
        "area": area,
        "summary": summary,
        "details": redacted_details,
        "artifacts": [f"{base_path}/metrics.json", f"{base_path}/stamp.json"]
    }
    with open(f"{base_path}/report.json", "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    # metrics.json
    metrics_doc = {
        "evidence_id": evd_id,
        "metrics": redacted_metrics
    }
    with open(f"{base_path}/metrics.json", "w") as f:
        json.dump(metrics_doc, f, indent=2, sort_keys=True)

    # stamp.json
    stamp = {
        "evidence_id": evd_id,
        "created_at": datetime.now(UTC).isoformat()
    }
    with open(f"{base_path}/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

def append_to_ledger(entry: dict[str, Any]):
    """Appends an entry to the Governed Exception Ledger with a tamper-evident hash."""
    os.makedirs(os.path.dirname(EXCEPTION_LEDGER), exist_ok=True)

    # Simple hash of the entry (excluding previous hash for simplicity in sandbox)
    entry_str = json.dumps(entry, sort_keys=True)
    entry_hash = hashlib.sha256(entry_str.encode()).hexdigest()
    entry["tamper_evidence_hash"] = entry_hash

    with open(EXCEPTION_LEDGER, "a") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")

def main():
    parser = argparse.ArgumentParser(description="SlopGuard CLI")
    parser.add_argument("--artifact", type=str, required=True, help="Path to artifact JSON")
    parser.add_argument("--policy", type=str, help="Path to policy JSON")
    parser.add_argument("--override-reason", type=str, help="Justification for override")
    parser.add_argument("--approver", type=str, help="Approver for override")

    args = parser.parse_args()

    if args.policy:
        policy_path = args.policy
    else:
        policy_path = os.environ.get("SLOPGUARD_POLICY_PATH", "config/slopguard.policy.json")
        if not os.path.exists(policy_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            policy_path = os.path.join(base_dir, "config", "slopguard.policy.json")

    enforcing = os.environ.get("SLOPGUARD_ENFORCING", "1") == "1"

    if not os.path.exists(args.artifact):
        print(f"Artifact not found: {args.artifact}")
        sys.exit(1)

    with open(args.artifact) as f:
        artifact = json.load(f)

    if not os.path.exists(policy_path):
        print(f"Policy not found: {policy_path}")
        sys.exit(1)

    with open(policy_path) as f:
        policy = json.load(f)

    never_log_fields = policy.get("never_log_fields", [])

    decision = evaluate_artifact(artifact=artifact, policy=policy)

    print(f"Decision: {'ALLOWED' if decision.allowed else 'DENIED'}")
    print(f"Score: {decision.score:.2f}")
    print(f"Reasons: {decision.reasons}")

    # Evidence generation...
    write_evidence(
        evd_id="EVD-AISLOPFT20260201-POLICY-001",
        area="policy",
        summary=f"SlopGuard evaluation for {artifact.get('kind', 'unknown')}",
        details={
            "allowed": decision.allowed,
            "decision_reasons": decision.reasons,
            "policy_version": decision.policy_version,
            "artifact_meta": artifact.get("meta", {})
        },
        metrics={},
        never_log_fields=never_log_fields
    )

    write_evidence(
        evd_id="EVD-AISLOPFT20260201-DETECT-002",
        area="detect",
        summary="Detailed slop scoring metrics",
        details={},
        metrics=decision.metadata.get("scoring_metrics", {}),
        never_log_fields=never_log_fields
    )

    # Handle Overrides
    if not decision.allowed and args.override_reason and args.approver:
        print(f"OVERRIDE APPLIED: {args.override_reason} (by {args.approver})")

        audit_entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "artifact_id": artifact.get("id", "unknown"),
            "reason": args.override_reason,
            "approver": args.approver,
            "decision_reasons": decision.reasons,
            "score": decision.score
        }

        append_to_ledger(audit_entry)

        write_evidence(
            evd_id="EVD-AISLOPFT20260201-AUDIT-005",
            area="audit",
            summary="Manual override for SlopGuard deny",
            details=audit_entry,
            metrics={},
            never_log_fields=never_log_fields
        )
        sys.exit(0)

    if not decision.allowed and enforcing:
        print("Enforcement active: exiting with error.")
        sys.exit(1)

if __name__ == "__main__":
    main()
