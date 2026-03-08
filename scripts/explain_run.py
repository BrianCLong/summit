#!/usr/bin/env python3
"""Run deterministic SHAP-IQ style analysis and emit artifacts."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from explain.shap_iq import ExplainConfig, explain, write_artifacts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="JSON file with model_id, feature_names, coefficients, rows")
    parser.add_argument("--output", required=True, help="Output directory for report artifacts")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--enable", action="store_true", help="Feature flag gate for explainability run")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.enable:
        raise SystemExit("explainability module is disabled by default; pass --enable")

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    result = explain(
        model_id=payload["model_id"],
        feature_names=payload["feature_names"],
        rows=payload["rows"],
        coefficients=payload["coefficients"],
        baseline=payload.get("baseline"),
        config=ExplainConfig(seed=args.seed),
    )
    paths = write_artifacts(args.output, payload["model_id"], payload["feature_names"], result)
    for path in paths:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
