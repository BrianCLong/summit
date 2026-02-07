#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


STATUS_TO_COLOR = {
    "verified": "brightgreen",
    "failed": "red",
    "skipped": "lightgrey",
}

STATUS_TO_MESSAGE = {
    "verified": "verified",
    "failed": "failed",
    "skipped": "skipped",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Derive badge payload from supply-chain summary")
    parser.add_argument("--summary", required=True)
    parser.add_argument("--label", default="sbom")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    summary_path = Path(args.summary)
    summary = json.loads(summary_path.read_text())
    status = summary.get("verification", {}).get("status", "skipped")
    color = STATUS_TO_COLOR.get(status, "lightgrey")
    message = STATUS_TO_MESSAGE.get(status, "unknown")

    badge = {
        "schemaVersion": 1,
        "label": args.label,
        "message": message,
        "color": color,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(badge, indent=2))


if __name__ == "__main__":
    main()
