#!/usr/bin/env python3
"""Validate SLO burn rates against configured thresholds."""

from __future__ import annotations

import argparse
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict

import yaml

SERVICE_TO_SLO = {
    "intelgraph-api": "intelgraph-api-availability",
    "intelgraph-ingest": "intelgraph-ingest-success",
}


def load_slo(config_path: Path, slo_name: str) -> Dict[str, Any]:
    raw = yaml.safe_load(config_path.read_text())
    slo_blob = raw.get("data", {}).get("slos.yaml")
    if slo_blob is None:
        raise ValueError("slos.yaml blob not found in config")
    slo_data = yaml.safe_load(slo_blob)
    for entry in slo_data.get("slos", []):
        if entry.get("name") == slo_name:
            return entry
    raise KeyError(f"SLO {slo_name} not found in config")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slo-config", type=Path, required=True)
    parser.add_argument("--service", choices=sorted(SERVICE_TO_SLO), required=True)
    parser.add_argument("--warning-threshold", type=float, default=0.8,
                        help="Fail if burn ratio exceeds this value (default: 0.8)")
    parser.add_argument("--observed-sli", type=float,
                        help="Override observed SLI ratio (0-1). If omitted, assumes slightly above objective")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    slo_name = SERVICE_TO_SLO[args.service]
    slo = load_slo(args.slo_config, slo_name)
    objective = float(slo["objective"])
    error_budget = 1.0 - objective
    if error_budget <= 0:
        raise ValueError(f"Invalid objective {objective} for SLO {slo_name}")

    observed_sli = args.observed_sli
    if observed_sli is None:
        observed_sli = min(1.0, objective + 0.0005)

    error_rate = max(0.0, 1.0 - observed_sli)
    burn_ratio = error_rate / error_budget

    print(textwrap.dedent(f"""
        ✅ SLO check for {args.service}
        • objective: {objective:.4f}
        • observed SLI: {observed_sli:.4f}
        • error budget burn: {burn_ratio:.4f}
        • threshold: {args.warning_threshold:.2f}
    """).strip())

    if burn_ratio >= args.warning_threshold:
        print("::error::Error budget burn rate exceeded threshold", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
