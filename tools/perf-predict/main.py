import argparse
import json
from dataclasses import dataclass
from pathlib import Path

DEFAULT_LATENCY_BUDGET_MS = 200
DEFAULT_CPU_BUDGET = 0.7


@dataclass
class MetricsSnapshot:
    rps: float
    p95_ms: float
    cpu_util: float
    replicas: int

    @classmethod
    def from_dict(cls, data: dict[str, float]) -> "MetricsSnapshot":
        return cls(
            rps=float(data.get("rps", 0)),
            p95_ms=float(data.get("p95_ms", 0)),
            cpu_util=float(data.get("cpu_util", 0)),
            replicas=int(data.get("replicas", 1)),
        )


def load_metrics(path: str | None) -> MetricsSnapshot:
    if not path:
        return MetricsSnapshot(rps=50, p95_ms=150, cpu_util=0.55, replicas=3)

    data = json.loads(Path(path).read_text())
    return MetricsSnapshot.from_dict(data)


def rps_at_budget(snapshot: MetricsSnapshot, budget_ms: float) -> float:
    if snapshot.p95_ms <= 0:
        return 0
    scaling = budget_ms / snapshot.p95_ms
    return snapshot.rps * scaling


def replicas_required(snapshot: MetricsSnapshot, target_rps: float) -> int:
    if snapshot.rps <= 0:
        return snapshot.replicas
    per_replica = snapshot.rps / snapshot.replicas
    required = target_rps / per_replica
    return max(snapshot.replicas, int(required + 0.999))


def burn_rate(snapshot: MetricsSnapshot, slo_budget: float = 0.995) -> float:
    error_budget = 1 - slo_budget
    observed_error = max(0.0, min(1.0, snapshot.cpu_util - DEFAULT_CPU_BUDGET))
    if error_budget == 0:
        return 0
    return observed_error / error_budget


def predict_capacity(args: argparse.Namespace) -> dict[str, float]:
    snapshot = load_metrics(args.metrics)
    budget = args.budget_ms or DEFAULT_LATENCY_BUDGET_MS
    target = args.target_rps
    required_replicas = replicas_required(snapshot, target)

    return {
        "service": args.service,
        "target_rps": target,
        "replicas_required": required_replicas,
        "estimated_p95_at_target": snapshot.p95_ms * (target / max(snapshot.rps, 1)),
        "rps_at_budget": rps_at_budget(snapshot, budget),
    }


def predict_headroom(args: argparse.Namespace) -> dict[str, float]:
    snapshot = load_metrics(args.metrics)
    budget = args.budget_ms or DEFAULT_LATENCY_BUDGET_MS
    capacity = rps_at_budget(snapshot, budget)
    headroom = (capacity - snapshot.rps) / max(snapshot.rps, 1)
    return {
        "journey": args.journey,
        "current_rps": snapshot.rps,
        "budget_ms": budget,
        "headroom_ratio": round(headroom, 3),
    }


def predict_burn(args: argparse.Namespace) -> dict[str, float]:
    snapshot = load_metrics(args.metrics)
    burn = burn_rate(snapshot)
    return {
        "journey": args.journey,
        "duration": args.duration,
        "burn_rate": round(burn, 3),
    }


def emit_json(payload: dict[str, float]) -> None:
    print(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict performance headroom and scaling needs.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    capacity = subparsers.add_parser("capacity", help="Predict replicas and headroom for a service")
    capacity.add_argument("--service", required=True)
    capacity.add_argument("--target-rps", dest="target_rps", type=float, required=True)
    capacity.add_argument("--budget-ms", dest="budget_ms", type=float, default=None)
    capacity.add_argument("--metrics", help="Path to metrics snapshot JSON")
    capacity.set_defaults(func=predict_capacity)

    headroom = subparsers.add_parser("headroom", help="Current headroom for a journey")
    headroom.add_argument("--journey", required=True)
    headroom.add_argument("--budget-ms", dest="budget_ms", type=float, default=None)
    headroom.add_argument("--metrics")
    headroom.set_defaults(func=predict_headroom)

    burn = subparsers.add_parser("burn", help="Forecast error-budget burn")
    burn.add_argument("--journey", required=True)
    burn.add_argument("--duration", default="60m")
    burn.add_argument("--metrics")
    burn.set_defaults(func=predict_burn)

    args = parser.parse_args()
    payload = args.func(args)
    emit_json(payload)


if __name__ == "__main__":
    main()
