#!/usr/bin/env python3
"""
Evaluate canary metrics and trigger automated rollback when thresholds are breached.
The script is intentionally side-effect free except for emitting a decision log and exit codes.
- Exit 0: promote/continue
- Exit 10: rollback requested
- Exit 1: invalid input
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class Thresholds:
    error_rate_absolute: float = 0.015
    error_rate_delta: float = 0.005
    latency_p95_ms: int = 450
    latency_p95_delta_ratio: float = 0.20
    minimum_windows: int = 2


@dataclass
class ProbeResult:
    status: str
    latency_ms: Optional[float] = None
    errors: Optional[List[str]] = None


@dataclass
class MetricsSnapshot:
    deployment_id: str
    build_sha: str
    artifact_digest: str
    policy_version: str
    stage: str
    service: str
    error_rate: float
    baseline_error_rate: float
    latency_p95_ms: float
    baseline_latency_p95_ms: float
    probe_results: Dict[str, ProbeResult]

    @staticmethod
    def from_dict(payload: Dict[str, object]) -> "MetricsSnapshot":
        try:
            probe_results = {
                name: ProbeResult(**details) for name, details in payload["probe_results"].items()
            }
            return MetricsSnapshot(
                deployment_id=str(payload["deployment_id"]),
                build_sha=str(payload["build_sha"]),
                artifact_digest=str(payload["artifact_digest"]),
                policy_version=str(payload["policy_version"]),
                stage=str(payload["stage"]),
                service=str(payload["service"]),
                error_rate=float(payload["error_rate"]),
                baseline_error_rate=float(payload["baseline_error_rate"]),
                latency_p95_ms=float(payload["latency_p95_ms"]),
                baseline_latency_p95_ms=float(payload["baseline_latency_p95_ms"]),
                probe_results=probe_results,
            )
        except KeyError as exc:
            raise ValueError(f"Missing required field: {exc}") from exc


@dataclass
class Decision:
    decision: str
    reasons: List[str]
    breach_metrics: Dict[str, float]
    deployment_id: str
    build_sha: str
    artifact_digest: str
    policy_version: str
    stage: str
    timestamp: str
    rollback_command: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


class CanaryEvaluator:
    def __init__(self, thresholds: Thresholds):
        self.thresholds = thresholds

    def evaluate(self, snapshot: MetricsSnapshot) -> Decision:
        reasons: List[str] = []
        breach_metrics: Dict[str, float] = {}

        if snapshot.error_rate > self.thresholds.error_rate_absolute:
            reasons.append("error_rate_above_absolute")
            breach_metrics["error_rate"] = snapshot.error_rate
        if snapshot.error_rate - snapshot.baseline_error_rate > self.thresholds.error_rate_delta:
            reasons.append("error_rate_delta_exceeded")
            breach_metrics["error_rate_delta"] = snapshot.error_rate - snapshot.baseline_error_rate

        if snapshot.latency_p95_ms > self.thresholds.latency_p95_ms:
            reasons.append("latency_p95_above_absolute")
            breach_metrics["latency_p95_ms"] = snapshot.latency_p95_ms
        latency_delta_ratio = (snapshot.latency_p95_ms - snapshot.baseline_latency_p95_ms) / snapshot.baseline_latency_p95_ms
        if latency_delta_ratio > self.thresholds.latency_p95_delta_ratio:
            reasons.append("latency_p95_delta_exceeded")
            breach_metrics["latency_p95_delta_ratio"] = latency_delta_ratio

        failed_critical_probes = [name for name, probe in snapshot.probe_results.items() if probe.status != "pass"]
        if failed_critical_probes:
            reasons.append(f"failed_probes:{','.join(failed_critical_probes)}")

        if reasons:
            return Decision(
                decision="rollback",
                reasons=reasons,
                breach_metrics=breach_metrics,
                deployment_id=snapshot.deployment_id,
                build_sha=snapshot.build_sha,
                artifact_digest=snapshot.artifact_digest,
                policy_version=snapshot.policy_version,
                stage=snapshot.stage,
                timestamp=datetime.now(timezone.utc).isoformat(),
                rollback_command=(
                    "kubectl rollout undo deployment/intelgraph-server --namespace canary"
                ),
            )

        return Decision(
            decision="promote",
            reasons=["within_thresholds"],
            breach_metrics={},
            deployment_id=snapshot.deployment_id,
            build_sha=snapshot.build_sha,
            artifact_digest=snapshot.artifact_digest,
            policy_version=snapshot.policy_version,
            stage=snapshot.stage,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate canary metrics and request rollback if needed.")
    parser.add_argument("--metrics-file", required=True, help="Path to JSON file with canary metrics + probes")
    parser.add_argument("--log-dir", default="artifacts/canary-decisions", help="Directory to write decision logs")
    parser.add_argument("--error-rate", type=float, help="Override absolute error rate threshold")
    parser.add_argument("--error-rate-delta", type=float, help="Override error rate delta threshold")
    parser.add_argument("--latency-p95", type=int, help="Override latency p95 threshold in ms")
    parser.add_argument(
        "--latency-p95-delta-ratio", type=float, help="Override latency delta ratio threshold (e.g., 0.2 for +20%)"
    )
    return parser.parse_args()


def load_snapshot(path: Path) -> MetricsSnapshot:
    with path.open() as f:
        payload = json.load(f)
    return MetricsSnapshot.from_dict(payload)


def build_thresholds(args: argparse.Namespace) -> Thresholds:
    thresholds = Thresholds()
    if args.error_rate is not None:
        thresholds.error_rate_absolute = args.error_rate
    if args.error_rate_delta is not None:
        thresholds.error_rate_delta = args.error_rate_delta
    if args.latency_p95 is not None:
        thresholds.latency_p95_ms = args.latency_p95
    if args.latency_p95_delta_ratio is not None:
        thresholds.latency_p95_delta_ratio = args.latency_p95_delta_ratio
    return thresholds


def write_decision(decision: Decision, log_dir: Path) -> Path:
    log_dir.mkdir(parents=True, exist_ok=True)
    filename = f"rollback-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path = log_dir / filename
    path.write_text(decision.to_json() + "\n")
    return path


def main() -> int:
    args = parse_args()
    metrics_path = Path(args.metrics_file)
    if not metrics_path.exists():
        print(f"metrics file does not exist: {metrics_path}", file=sys.stderr)
        return 1

    thresholds = build_thresholds(args)
    try:
        snapshot = load_snapshot(metrics_path)
    except ValueError as exc:
        print(f"invalid metrics payload: {exc}", file=sys.stderr)
        return 1

    evaluator = CanaryEvaluator(thresholds)
    decision = evaluator.evaluate(snapshot)
    log_path = write_decision(decision, Path(args.log_dir))
    print(decision.to_json())
    print(f"decision log written to {log_path}")

    if decision.decision == "rollback":
        print("rollback requested", file=sys.stderr)
        return 10
    return 0


if __name__ == "__main__":
    sys.exit(main())
