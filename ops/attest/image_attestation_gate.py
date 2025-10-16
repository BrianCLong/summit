#!/usr/bin/env python3
"""Deploy-time attestation verifier for container releases."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class ImageRecord:
    service: str
    image: str
    digest: str
    signed: bool
    attestations_verified: bool
    sbom_present: bool
    issues: list[str]

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        return data


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify signatures and attestations for a release manifest"
    )
    parser.add_argument("manifest", help="Release manifest JSON with signatures and attestations")
    parser.add_argument("--output", help="Write verification summary JSON to this path")
    parser.add_argument(
        "--require-sbom",
        action="store_true",
        help="Fail if an image omits the sbom field",
    )
    return parser.parse_args()


def load_manifest(path: Path) -> dict[str, object]:
    data = json.loads(path.read_text())
    if "images" not in data:
        raise ValueError("Manifest missing 'images' array")
    return data


def verify_image(image: dict[str, object], require_sbom: bool) -> ImageRecord:
    service = image.get("service") or "unknown"
    ref = image.get("image") or service
    digest = image.get("digest", "")

    signature = image.get("signature", {}) or {}
    signed = bool(signature.get("verified"))

    attestations = image.get("attestations", []) or []
    attestations_verified = bool(attestations) and all(a.get("verified") for a in attestations)

    sbom_present = bool(image.get("sbom"))

    issues: list[str] = []
    if not signed:
        issues.append("missing verified signature")
    if not attestations_verified:
        issues.append("attestation not verified")
    if require_sbom and not sbom_present:
        issues.append("sbom missing")

    for attestation in attestations:
        if not attestation.get("verified"):
            reason = attestation.get("reason", "unknown failure")
            issues.append(f"attestation {attestation.get('type', 'unknown')} failed: {reason}")

    return ImageRecord(
        service=service,
        image=ref,
        digest=digest,
        signed=signed,
        attestations_verified=attestations_verified,
        sbom_present=sbom_present,
        issues=issues,
    )


def build_summary(manifest: dict[str, object], records: list[ImageRecord]) -> dict[str, object]:
    total = len(records)
    signed = sum(1 for r in records if r.signed)
    attested = sum(1 for r in records if r.attestations_verified)
    sbom_attached = sum(1 for r in records if r.sbom_present)

    now = datetime.now(timezone.utc).isoformat()

    return {
        "release": manifest.get("release"),
        "generated_at": now,
        "images": [record.to_dict() for record in records],
        "totals": {
            "images": total,
            "signed": signed,
            "attested": attested,
            "sbom_attached": sbom_attached,
        },
        "policy": {
            "all_signed": signed == total,
            "all_attested": attested == total,
            "all_sbom_present": sbom_attached == total,
        },
    }


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)
    manifest = load_manifest(manifest_path)

    records: list[ImageRecord] = []
    violations: list[str] = []
    for image in manifest.get("images", []):
        record = verify_image(image, args.require_sbom)
        records.append(record)
        if record.issues:
            violations.append(f"{record.service}: {', '.join(record.issues)}")

    summary = build_summary(manifest, records)

    for record in records:
        status = "PASS" if not record.issues else "FAIL"
        print(f"[{status}] {record.service} — image={record.image} digest={record.digest}")
        if record.issues:
            for issue in record.issues:
                print(f"  • {issue}")

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(summary, indent=2, sort_keys=True))

    if violations:
        print("Deploy blocked: attestation gate failed.", file=sys.stderr)
        return 1

    print("All release images are signed and attested.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
