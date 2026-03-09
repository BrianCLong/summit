#!/usr/bin/env python3
import json
import os
import sys
import argparse

def generate_evidence(evidence_id, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    # Stamp - Deterministic, no timestamps
    stamp = {
        "evidence_id": evidence_id,
        "git_sha": os.environ.get("GIT_SHA", "unknown"),
        "workflow": os.environ.get("GITHUB_WORKFLOW", "unknown"),
        "runner_image_digest": os.environ.get("RUNNER_IMAGE_DIGEST", "unknown")
    }

    # Metrics (stub)
    metrics = {
        "image_size_bytes": 0,
        "sbom_package_count": 0,
        "attestation_count": 0
    }

    # Report (stub)
    report = {
        "status": "pending",
        "steps": []
    }

    def write_json(name, data):
        path = os.path.join(output_dir, name)
        with open(path, "w") as f:
            json.dump(data, f, sort_keys=True, indent=2)
            f.write("\n")

    write_json("stamp.json", stamp)
    write_json("metrics.json", metrics)
    write_json("report.json", report)

    print(f"Generated evidence in {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-id", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    generate_evidence(args.evidence_id, args.output_dir)
