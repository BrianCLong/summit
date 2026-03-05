#!/usr/bin/env python3
"""Compare two metrics artifacts and emit a drift report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--threshold", type=float, default=0.2)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
    candidate = json.loads(Path(args.candidate).read_text(encoding="utf-8"))

    base_shap = float(baseline.get("mean_abs_shap", 0.0))
    cand_shap = float(candidate.get("mean_abs_shap", 0.0))
    denom = base_shap if base_shap else 1.0
    shift = abs(cand_shap - base_shap) / abs(denom)

    base_ix = float(baseline.get("interaction_strength_mean", 0.0))
    cand_ix = float(candidate.get("interaction_strength_mean", 0.0))
    ix_shift = abs(cand_ix - base_ix) / (abs(base_ix) if base_ix else 1.0)

    report = {
        "mean_abs_shap_shift": shift,
        "interaction_strength_shift": ix_shift,
        "threshold": args.threshold,
        "status": "alert" if max(shift, ix_shift) > args.threshold else "ok",
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
