import json
import os
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path
from summit.slopguard.policy import evaluate_artifact

def main():
    parser = argparse.ArgumentParser(description="SlopGuard CLI")
    parser.add_argument("--artifact", required=True, help="Path to artifact JSON")
    parser.add_argument("--policy", default="config/slopguard.policy.json", help="Path to policy JSON")
    parser.add_argument("--enforce", action="store_true", help="Fail CI on deny")
    parser.add_argument("--output-dir", default="evidence", help="Directory for evidence")
    parser.add_argument("--override-reason", help="Reason for overriding a deny")
    parser.add_argument("--approver", help="Who approved the override")

    args = parser.parse_args()

    with open(args.artifact, 'r') as f:
        artifact = json.load(f)

    with open(args.policy, 'r') as f:
        policy = json.load(f)

    decision = evaluate_artifact(artifact=artifact, policy=policy)

    # Emit evidence
    evidence_id_policy = "EVD-AISLOPFT20260201-POLICY-001"
    evidence_id_audit = "EVD-AISLOPFT20260201-AUDIT-005"

    report = {
        "evidence_id": evidence_id_policy,
        "summary": f"SlopGuard evaluation: {'ALLOWED' if decision.allowed else 'DENIED'}",
        "details": {
            "score": decision.score,
            "reasons": decision.reasons,
            "override_required": decision.override_required
        },
        "policy_version": decision.policy_version
    }

    metrics = {
        "evidence_id": evidence_id_policy,
        "metrics": {
            "slop_score": decision.score,
            "reasons_count": len(decision.reasons)
        }
    }

    stamp = {
        "evidence_id": evidence_id_policy,
        "generated_at_utc": datetime.now(timezone.utc).isoformat()
    }

    # Write files
    (Path(args.output_dir) / "policy").mkdir(parents=True, exist_ok=True)
    with open(Path(args.output_dir) / "policy" / "report.json", 'w') as f:
        json.dump(report, f, indent=2)
    with open(Path(args.output_dir) / "policy" / "metrics.json", 'w') as f:
        json.dump(metrics, f, indent=2)
    with open(Path(args.output_dir) / "policy" / "stamp.json", 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"SlopGuard Result: {'ALLOWED' if decision.allowed else 'DENIED'}")

    overridden = False
    if not decision.allowed and args.override_reason and args.approver:
        overridden = True
        print(f"OVERRIDDEN by {args.approver} for reason: {args.override_reason}")

        audit_report = {
            "evidence_id": evidence_id_audit,
            "summary": "SlopGuard Override Audit",
            "details": {
                "original_decision": "DENIED",
                "override_reason": args.override_reason,
                "approver": args.approver,
                "reasons": decision.reasons,
                "score": decision.score
            },
            "policy_version": decision.policy_version
        }

        audit_stamp = {
            "evidence_id": evidence_id_audit,
            "generated_at_utc": datetime.now(timezone.utc).isoformat()
        }

        (Path(args.output_dir) / "audit").mkdir(parents=True, exist_ok=True)
        with open(Path(args.output_dir) / "audit" / "report.json", 'w') as f:
            json.dump(audit_report, f, indent=2)
        with open(Path(args.output_dir) / "audit" / "stamp.json", 'w') as f:
            json.dump(audit_stamp, f, indent=2)

    if args.enforce and not decision.allowed and not overridden:
        if os.environ.get("SLOPGUARD_ENFORCING") == "0":
            print("Enforcement disabled via SLOPGUARD_ENFORCING=0")
        else:
            print("Denied. Exiting with error.")
            sys.exit(1)

if __name__ == "__main__":
    main()
