#!/usr/bin/env python3
"""Compare provenance manifests to confirm digests align."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, Set


def load_manifest(path: Path) -> Dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def extract_digests(manifest: Dict[str, object]) -> Set[str]:
    items: Iterable[Dict[str, object]]
    if "items" in manifest:
        items = manifest["items"]  # type: ignore[assignment]
    else:
        charts = manifest.get("charts", [])  # type: ignore[assignment]
        images = manifest.get("images", [])  # type: ignore[assignment]
        items = list(charts) + list(images)
    digests = {entry["sha256"] for entry in items if "sha256" in entry}
    if not digests:
        raise ValueError("manifest does not contain any sha256 digests")
    return digests


def compare_manifests(baseline: Path, candidate: Path) -> None:
    base_digests = extract_digests(load_manifest(baseline))
    candidate_digests = extract_digests(load_manifest(candidate))

    missing = base_digests - candidate_digests
    extra = candidate_digests - base_digests

    if missing or extra:
        if missing:
            print(f"❌ missing digests: {sorted(missing)}")
        if extra:
            print(f"❌ unexpected digests: {sorted(extra)}")
        raise SystemExit(1)

    print("✅ provenance digests align")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify provenance alignment between two manifests")
    parser.add_argument("baseline", type=Path, help="Path to the baseline manifest (resync-manifest.json)")
    parser.add_argument("candidate", type=Path, help="Path to the new manifest or ledger")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    compare_manifests(args.baseline, args.candidate)


if __name__ == "__main__":
    main()
