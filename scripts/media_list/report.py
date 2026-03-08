import argparse
import hashlib
import json


def generate_report(slug, evidence, metrics, flags):
    report = {
        "slug": slug,
        "summary": {
            "total_tools": 1,
            "total_claims": len(evidence),
            "governance_score": 100 - metrics.get("data_exposure_risk", 0) * 5
        },
        "details": {
            "tools": [{"id": "TOOL-01", "name": "Mock Tool"}],
            "claims": evidence,
            "policy_flags": flags
        }
    }
    return report

def generate_stamp(report, input_hash):
    # Serialized json string for determinism
    report_str = json.dumps(report, sort_keys=True)
    stamp = {
        "input_hash": input_hash,
        "deterministic": True,
        "version": "0.1.0",
        "report_hash": hashlib.sha256(report_str.encode()).hexdigest()
    }
    return stamp

def main():
    parser = argparse.ArgumentParser(description="Deterministic Report Generator")
    parser.add_argument("--slug", type=str, required=True, help="Media list slug")
    parser.add_argument("--evidence", type=str, required=True, help="Path to evidence.json")
    parser.add_argument("--metrics", type=str, required=True, help="Path to metrics.json")
    parser.add_argument("--flags", type=str, required=True, help="Path to policy_flags.json")
    parser.add_argument("--report_out", type=str, required=True, help="Path to output report.json")
    parser.add_argument("--stamp_out", type=str, required=True, help="Path to output stamp.json")
    parser.add_argument("--input_hash", type=str, default="sha256:0000", help="Hash of original input")
    args = parser.parse_args()

    with open(args.evidence) as f:
        evidence = json.load(f)
    with open(args.metrics) as f:
        metrics = json.load(f)
    with open(args.flags) as f:
        flags = json.load(f)

    report = generate_report(args.slug, evidence, metrics, flags)
    stamp = generate_stamp(report, args.input_hash)

    with open(args.report_out, "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    with open(args.stamp_out, "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    print(f"Report saved to {args.report_out}")

if __name__ == "__main__":
    main()
