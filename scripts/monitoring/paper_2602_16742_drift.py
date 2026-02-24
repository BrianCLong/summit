#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_METRIC_KEY = "qwen3_vl_8b_deepvision_wemath_pass_at_1"


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def _extract_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    if "metrics" in payload and isinstance(payload["metrics"], dict):
        return payload["metrics"]
    return payload


def _extract_value(payload: dict[str, Any], metric_key: str) -> float:
    metrics = _extract_metrics(payload)
    if metric_key not in metrics:
        if metrics.get("metric_key") == metric_key and "observed_value" in metrics:
            return float(metrics["observed_value"])
        raise ValueError(f"Missing metric '{metric_key}'")
    return float(metrics[metric_key])


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Drift detector for paper 2602.16742")
    parser.add_argument("--baseline", required=True, help="Baseline metrics JSON path")
    parser.add_argument("--current", required=True, help="Current metrics JSON path")
    parser.add_argument("--out-dir", required=True, help="Output folder for drift artifacts")
    parser.add_argument("--metric-key", default=DEFAULT_METRIC_KEY)
    parser.add_argument("--threshold", type=float, default=0.50, help="Absolute delta threshold")
    args = parser.parse_args(argv)

    baseline = _read_json(Path(args.baseline))
    current = _read_json(Path(args.current))

    baseline_value = _extract_value(baseline, args.metric_key)
    current_value = _extract_value(current, args.metric_key)
    delta_abs = abs(current_value - baseline_value)
    breached = delta_abs > args.threshold

    out_dir = Path(args.out_dir)
    trend = {
        "baseline_value": baseline_value,
        "current_value": current_value,
        "delta_abs": delta_abs,
        "metric_key": args.metric_key,
    }
    variance = {
        "breached": breached,
        "delta_abs": delta_abs,
        "metric_key": args.metric_key,
        "threshold": args.threshold,
    }
    alert_log = "ALERT: drift threshold breached\n" if breached else "OK: drift within threshold\n"

    _write_json(out_dir / "trend.json", trend)
    _write_json(out_dir / "variance.json", variance)
    (out_dir / "alert.log").write_text(alert_log, encoding="utf-8")

    return 1 if breached else 0


if __name__ == "__main__":
    raise SystemExit(main())
