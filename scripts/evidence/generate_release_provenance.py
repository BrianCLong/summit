#!/usr/bin/env python3
"""
Generate release evidence provenance attestation (in-toto SLSA-style).
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

def compute_sha256(filepath):
    """Compute SHA256 digest of a file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def generate_provenance(
    tag,
    commit_sha,
    repo_uri,
    workflow_ref,
    run_id,
    run_url,
    tarball_path,
    output_path,
    additional_subjects=None
):
    """Generate in-toto statement."""

    # 1. Compute digest for the main subject (tarball)
    tarball_name = os.path.basename(tarball_path)
    tarball_digest = compute_sha256(tarball_path)

    subjects = [
        {
            "name": tarball_name,
            "digest": {
                "sha256": tarball_digest
            }
        }
    ]

    # 2. Compute digests for additional subjects
    if additional_subjects:
        for subj_path in additional_subjects:
            if os.path.exists(subj_path):
                subj_name = os.path.basename(subj_path)
                subj_digest = compute_sha256(subj_path)
                subjects.append({
                    "name": subj_name,
                    "digest": {
                        "sha256": subj_digest
                    }
                })

    # 3. Construct the statement
    # Using current time for build timestamps as approximation since we are in the build job
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    statement = {
        "_type": "https://in-toto.io/Statement/v0.1",
        "subject": subjects,
        "predicateType": "https://slsa.dev/provenance/v0.2",
        "predicate": {
            "builder": {
                "id": "https://github.com/actions/runner"
            },
            "buildType": "https://github.com/actions/workflow",
            "invocation": {
                "configSource": {
                    "uri": repo_uri,
                    "digest": {
                        "sha1": commit_sha
                    },
                    "entryPoint": workflow_ref
                },
                "parameters": {
                    "tag": tag,
                    "run_id": str(run_id),
                    "run_url": run_url
                },
                "environment": {
                    "github_run_id": str(run_id),
                    "github_run_url": run_url,
                    "github_actor": os.environ.get("GITHUB_ACTOR", "unknown"),
                    "github_sha": commit_sha,
                    "github_ref": f"refs/tags/{tag}"
                }
            },
            "metadata": {
                "buildStartedOn": now_utc,
                "buildFinishedOn": now_utc,
                "completeness": {
                    "parameters": True,
                    "environment": False,
                    "materials": False
                },
                "reproducible": False
            },
            "materials": [
                {
                    "uri": repo_uri,
                    "digest": {
                        "sha1": commit_sha
                    }
                }
            ]
        }
    }

    # 4. Write to output
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(statement, f, indent=2, sort_keys=True)

    print(f"Generated provenance statement at {output_path}")
    print(f"Subject: {tarball_name} (sha256:{tarball_digest})")

def main():
    parser = argparse.ArgumentParser(description="Generate release evidence provenance")
    parser.add_argument("--tag", required=True, help="Release tag (e.g., v1.0.0)")
    parser.add_argument("--sha", required=True, help="Commit SHA")
    parser.add_argument("--repo", required=True, help="Repository URI (e.g., git+https://github.com/org/repo)")
    parser.add_argument("--workflow", required=True, help="Workflow reference")
    parser.add_argument("--run-id", required=True, help="GitHub Run ID")
    parser.add_argument("--run-url", required=True, help="GitHub Run URL")
    parser.add_argument("--tarball", required=True, help="Path to evidence tarball")
    parser.add_argument("--output", required=True, help="Output path for in-toto JSON")
    parser.add_argument("--subjects", nargs="*", help="Additional subject files to attest")

    args = parser.parse_args()

    generate_provenance(
        tag=args.tag,
        commit_sha=args.sha,
        repo_uri=args.repo,
        workflow_ref=args.workflow,
        run_id=args.run_id,
        run_url=args.run_url,
        tarball_path=args.tarball,
        output_path=args.output,
        additional_subjects=args.subjects
    )

if __name__ == "__main__":
    main()
