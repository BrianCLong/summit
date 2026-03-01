#!/usr/bin/env python3
"""Generate supply-chain evidence artifacts for a given evidence ID."""
import argparse
import json
import os
import hashlib
import datetime


def main():
    parser = argparse.ArgumentParser(description="Generate supply-chain evidence")
    parser.add_argument("--evidence-id", required=True, help="Evidence ID")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    evidence = {
        "evidence_id": args.evidence_id,
        "schema_version": "1.0.0",
        "generator": "summit-supplychain",
        "materials": [],
        "attestations": [],
        "digest": hashlib.sha256(args.evidence_id.encode()).hexdigest(),
    }

    manifest = {
        "evidence_id": args.evidence_id,
        "artifacts": ["evidence.json"],
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    with open(os.path.join(args.output_dir, "evidence.json"), "w") as f:
        json.dump(evidence, f, indent=2)

    with open(os.path.join(args.output_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Evidence written to {args.output_dir}")


if __name__ == "__main__":
    main()
