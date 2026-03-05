"""CLI for Unity package scan with deterministic outputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from summit.pkg.unity_adapter import scan_unity_package


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a Unity package manifest")
    parser.add_argument("manifest", type=Path, help="Path to package.json")
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path("policies/registry_policy.yaml"),
        help="Registry policy yaml",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts"),
        help="Output directory for deterministic artifacts",
    )
    args = parser.parse_args()

    artifacts = scan_unity_package(args.manifest, policy_path=args.policy)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for filename, payload in artifacts.items():
        output_path = args.output_dir / filename
        output_path.write_text(
            json.dumps(payload, sort_keys=True, indent=2) + "\n", encoding="utf-8"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
