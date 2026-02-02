#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

# Reuse patterns and logic from standard evidence verifier
ISO_TS_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")

def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def verify_market_intel_bundle(bundle_dir: Path):
    print(f"Verifying bundle: {bundle_dir}")
    report_path = bundle_dir / "report.json"
    if not report_path.exists():
        return

    report = load_json(report_path)

    # Rule: Numeric claims must have citations
    claims = report.get("claims", [])
    for claim in claims:
        if claim.get("type") == "numeric":
            citations = claim.get("citations", [])
            if not citations:
                print(f"Error: Numeric claim in {report_path} missing citations.")
                sys.exit(1)

    # Rule: License enforcement (WSJ/restricted sources)
    sources = report.get("sources", [])
    for source in sources:
        publisher = source.get("publisher", "")
        is_restricted = source.get("restricted_body") is True or "WSJ" in publisher or source.get("license_class") == "restricted"
        if is_restricted:
            if "body" in source:
                 print(f"Error: Restricted source {publisher} in {report_path} contains a 'body' field.")
                 sys.exit(1)
            if source.get("restricted_body") is not True:
                 print(f"Error: Restricted source {publisher} in {report_path} missing 'restricted_body: true' flag.")
                 sys.exit(1)

def verify_timestamps_isolation(bundle_dir: Path):
    for path in bundle_dir.glob("*.json"):
        if path.name == "stamp.json":
            continue
        content = path.read_text(encoding="utf-8")
        if ISO_TS_PATTERN.search(content):
            print(f"Error: Timestamp found outside stamp.json in {path}")
            sys.exit(1)

def main():
    root = Path(".")
    index_path = root / "evidence/index.json"
    if not index_path.exists():
        print("Evidence index not found.")
        return 0

    index = load_json(index_path)
    items = index.get("items", {})

    market_intel_bundles = []
    for eid, info in items.items():
        if info.get("category") == "market-intel":
            # Assume first file's parent is the bundle dir
            if info.get("files"):
                bundle_dir = root / Path(info["files"][0]).parent
                market_intel_bundles.append(bundle_dir)

    for bundle in market_intel_bundles:
        verify_market_intel_bundle(bundle)
        verify_timestamps_isolation(bundle)

    print("Market Intel evidence verification passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
