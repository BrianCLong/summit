#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

# Add root to sys.path to allow importing from ci module
sys.path.append(str(Path(__file__).parent.parent.parent))

from ci.graphci.lib.evidence_writer import EvidenceWriter
from ci.graphci.lib.hash_tree import hash_data


def main():
    parser = argparse.ArgumentParser(description="GraphCI: Competitive Intelligence Pipeline")
    parser.add_argument("--registry", default="ci/graphci/registry.yaml", help="Path to source registry")
    parser.add_argument("--output-dir", default="evidence", help="Output directory for evidence")
    parser.add_argument("--evidence-id", required=True, help="Evidence ID to generate (e.g., EVID-graphci-...)")
    parser.add_argument("--mode", choices=["fetch", "diff", "publish", "full"], default="full", help="Execution mode")

    args = parser.parse_args()

    # Ensure evidence ID matches pattern
    # The pattern is ^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$ in schema
    # But user plan says EVID-graphci-YYYYMMDD-HHMMSSZ-<content_hash12>
    # The schema enforces EVD-... so we might need to adjust or user plan is slightly off on ID prefix
    # "EVID" vs "EVD". Schema says EVD. User says EVID.
    # I should use EVD to pass schema.

    if not args.evidence_id.startswith("EVD-"):
        print(f"Error: Evidence ID must start with EVD-, got {args.evidence_id}")
        sys.exit(1)

    writer = EvidenceWriter(args.evidence_id, Path(args.output_dir))

    print(f"Starting GraphCI run: {args.evidence_id} in mode {args.mode}")

    # Placeholder for actual logic
    # In PR1, we just demonstrate evidence writer usage

    # Example evidence generation
    writer.write_report(f"GraphCI Run for {args.evidence_id} (Mode: {args.mode})")

    # Write some dummy metrics
    writer.write_metrics({"duration_sec": 0.1, "sources_count": 0})

    # Write stamp with hash
    writer.write_stamp(
        input_hash={"registry": hash_data("dummy")},
        tool_versions={"graphci": "0.1.0"}
    )

    print(f"Evidence generated in {args.output_dir}/{args.evidence_id}")

if __name__ == "__main__":
    main()
