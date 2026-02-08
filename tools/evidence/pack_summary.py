#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_summary(args: argparse.Namespace) -> dict:
    sbom_path = Path(args.sbom_path)
    sbom_sha = sha256_file(sbom_path) if sbom_path.exists() else ""
    attestation_path = Path(args.attestation_bundle)
    attestation_status = "present" if attestation_path.exists() else "missing"

    summary = {
        "schemaVersion": 1,
        "commit": {
            "sha": args.commit_sha,
            "repository": args.repository,
        },
        "sbom": {
            "path": args.sbom_path,
            "format": args.sbom_format,
            "sha256": sbom_sha,
        },
        "attestation": {
            "predicateType": args.predicate_type,
            "status": attestation_status,
            "bundlePath": args.attestation_bundle,
        },
        "verification": {
            "status": args.verification_status,
            "issuer": args.verification_issuer,
            "subject": args.verification_subject,
        },
    }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack deterministic supply-chain evidence summary")
    parser.add_argument("--sbom-path", required=True)
    parser.add_argument("--sbom-format", required=True)
    parser.add_argument("--attestation-bundle", required=True)
    parser.add_argument("--predicate-type", required=True)
    parser.add_argument("--commit-sha", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--verification-status", required=True, choices=["verified", "failed", "skipped"])
    parser.add_argument("--verification-issuer", required=True)
    parser.add_argument("--verification-subject", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    summary = build_summary(args)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
