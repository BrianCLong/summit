from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ITEM_SLUG = "2602.16742"
DEFAULT_CLAIM_ID = "ITEM:RESULT-03"
DEFAULT_METRIC_KEY = "qwen3_vl_8b_deepvision_wemath_pass_at_1"
DEFAULT_TARGET_VALUE = 85.11
DEFAULT_TOLERANCE = 0.50
DEFAULT_EVIDENCE_ID = "EVD-2602-16742-EVAL-001"


@dataclass(frozen=True)
class EvalResult:
    within_tolerance: bool
    observed_value: float
    target_value: float
    tolerance: float
    delta_abs: float


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def evaluate_metric(observed_value: float, target_value: float, tolerance: float) -> EvalResult:
    delta_abs = abs(observed_value - target_value)
    return EvalResult(
        within_tolerance=delta_abs <= tolerance,
        observed_value=observed_value,
        target_value=target_value,
        tolerance=tolerance,
        delta_abs=delta_abs,
    )


def _extract_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    if "metrics" in payload and isinstance(payload["metrics"], dict):
        return payload["metrics"]
    return payload


def run_evaluation(
    *,
    metrics_payload: dict[str, Any],
    out_dir: Path,
    claim_id: str = DEFAULT_CLAIM_ID,
    metric_key: str = DEFAULT_METRIC_KEY,
    target_value: float = DEFAULT_TARGET_VALUE,
    tolerance: float = DEFAULT_TOLERANCE,
    evidence_id: str = DEFAULT_EVIDENCE_ID,
    runtime_ms: float = 0.0,
    peak_memory_mb: float = 0.0,
    cost_estimate: float = 0.0,
    generated_at: str | None = None,
) -> EvalResult:
    metrics = _extract_metrics(metrics_payload)
    if metric_key not in metrics:
        raise ValueError(f"Metric key not found: {metric_key}")

    observed_value = float(metrics[metric_key])
    result = evaluate_metric(observed_value, target_value, tolerance)
    status = "pass" if result.within_tolerance else "fail"

    report = {
        "artifacts": ["report.json", "metrics.json", "stamp.json", "evidence.json"],
        "claim_id": claim_id,
        "evidence_id": evidence_id,
        "evaluation": {
            "delta_abs": result.delta_abs,
            "metric_key": metric_key,
            "observed_value": result.observed_value,
            "target_value": result.target_value,
            "tolerance": result.tolerance,
            "within_tolerance": result.within_tolerance,
        },
        "item_slug": ITEM_SLUG,
        "status": status,
        "summary": f"Paper {ITEM_SLUG} claim reproduction {status}",
    }
    metrics_out = {
        "evidence_id": evidence_id,
        "metrics": {
            "cost_estimate": cost_estimate,
            "delta_abs": result.delta_abs,
            "metric_key": metric_key,
            "observed_value": result.observed_value,
            "peak_memory_mb": peak_memory_mb,
            "runtime_ms": runtime_ms,
            "target_value": result.target_value,
            "tolerance": result.tolerance,
            "within_tolerance": result.within_tolerance,
        },
    }

    report_path = out_dir / "report.json"
    metrics_path = out_dir / "metrics.json"
    _write_json(report_path, report)
    _write_json(metrics_path, metrics_out)

    report_bytes = report_path.read_bytes()
    metrics_bytes = metrics_path.read_bytes()
    report_hash = _sha256_bytes(report_bytes)
    metrics_hash = _sha256_bytes(metrics_bytes)

    stamp = {
        "evidence_id": evidence_id,
        "generated_at": generated_at or datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "sha256": {
            "metrics.json": metrics_hash,
            "report.json": report_hash,
        },
    }
    evidence = {
        "evidence_id": evidence_id,
        "files": {
            "metrics": "metrics.json",
            "report": "report.json",
            "stamp": "stamp.json",
        },
        "sha256": stamp["sha256"],
    }
    _write_json(out_dir / "stamp.json", stamp)
    _write_json(out_dir / "evidence.json", evidence)
    return result


def _load_metrics_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("Metrics file must contain a JSON object")
    return payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate claim reproduction for paper 2602.16742")
    parser.add_argument("--metrics-file", required=True, help="Input JSON with observed metrics")
    parser.add_argument("--out-dir", required=True, help="Output directory for evidence artifacts")
    parser.add_argument("--claim-id", default=DEFAULT_CLAIM_ID)
    parser.add_argument("--metric-key", default=DEFAULT_METRIC_KEY)
    parser.add_argument("--target-value", type=float, default=DEFAULT_TARGET_VALUE)
    parser.add_argument("--tolerance", type=float, default=DEFAULT_TOLERANCE)
    parser.add_argument("--evidence-id", default=DEFAULT_EVIDENCE_ID)
    parser.add_argument("--runtime-ms", type=float, default=0.0)
    parser.add_argument("--peak-memory-mb", type=float, default=0.0)
    parser.add_argument("--cost-estimate", type=float, default=0.0)
    parser.add_argument("--fail-on-miss", action="store_true")

    args = parser.parse_args(argv)

    result = run_evaluation(
        metrics_payload=_load_metrics_file(Path(args.metrics_file)),
        out_dir=Path(args.out_dir),
        claim_id=args.claim_id,
        metric_key=args.metric_key,
        target_value=args.target_value,
        tolerance=args.tolerance,
        evidence_id=args.evidence_id,
        runtime_ms=args.runtime_ms,
        peak_memory_mb=args.peak_memory_mb,
        cost_estimate=args.cost_estimate,
    )
    if args.fail_on_miss and not result.within_tolerance:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
