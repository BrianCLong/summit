"""Planning logic for the Inference Cost Optimizer (ICO)."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from .models import (
    AutoscalingPlan,
    EndpointPlan,
    EndpointState,
    PlanningSummary,
    QuantizationChoice,
    QuantizationOption,
)


@dataclass(frozen=True)
class PlannerConfig:
    """Tunable knobs for the planner."""

    target_utilization: float = 0.65
    scale_buffer: float = 1.2
    min_replicas_floor: int = 1
    namespace: str = "default"
    deterministic: bool = True

    def __post_init__(self) -> None:
        if not (0 < self.target_utilization <= 1):
            raise ValueError("target_utilization must be between 0 and 1")
        if self.scale_buffer < 1:
            raise ValueError("scale_buffer must be >= 1")
        if self.min_replicas_floor < 0:
            raise ValueError("min_replicas_floor must be >= 0")


@dataclass(frozen=True)
class PlanningRequest:
    endpoints: Sequence[EndpointState]
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PlanningResult:
    summary: PlanningSummary
    metadata: Dict[str, object]

    def to_dict(self) -> Dict[str, object]:
        return {
            "summary": {
                "total_baseline_cost": self.summary.total_baseline_cost(),
                "total_planned_cost": self.summary.total_planned_cost(),
                "total_savings_pct": self.summary.total_savings_pct(),
            },
            "plans": [
                {
                    "model": plan.endpoint.model,
                    "endpoint": plan.endpoint.endpoint,
                    "autoscaling": {
                        "min_replicas": plan.autoscaling.min_replicas,
                        "max_replicas": plan.autoscaling.max_replicas,
                        "target_replicas": plan.autoscaling.target_replicas,
                        "target_utilization": plan.autoscaling.target_utilization,
                    },
                    "quantization": {
                        "strategy": plan.quantization.name,
                        "latency_ms": plan.quantization.latency_ms,
                        "accuracy": plan.quantization.accuracy,
                        "qps_capacity": plan.quantization.qps_capacity,
                        "cost_per_replica": plan.quantization.cost_per_replica,
                        "expected_savings": plan.quantization.expected_savings,
                    },
                    "slo": {
                        "latency_ms": plan.endpoint.slo_latency_ms,
                        "accuracy": plan.endpoint.slo_accuracy,
                    },
                    "baseline": {
                        "replicas": plan.endpoint.baseline_replicas,
                        "latency_ms": plan.endpoint.baseline_latency_ms,
                        "accuracy": plan.endpoint.baseline_accuracy,
                        "cost_per_replica": plan.endpoint.baseline_cost_per_replica,
                        "qps_capacity": plan.endpoint.qps_capacity,
                        "total_cost": plan.baseline_cost,
                    },
                    "planned_cost": plan.planned_cost,
                    "latency_headroom_ms": plan.latency_headroom_ms,
                    "accuracy_headroom": plan.accuracy_headroom,
                    "savings_pct": plan.savings_pct(),
                    "quantization_recipe": plan.quantization_recipe(),
                    "hpa": plan.hpa_spec(),
                }
                for plan in self.summary.plans
            ],
            "metadata": self.metadata,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, sort_keys=True if indent else False)

    def hpa_specs(self) -> List[Dict[str, object]]:
        return self.summary.hpa_specs()

    def quantization_recipes(self) -> List[Dict[str, object]]:
        return self.summary.quantization_recipes()


class Planner:
    """Planner coordinating autoscaling and quantization decisions."""

    def __init__(self, config: PlannerConfig | None = None) -> None:
        self.config = config or PlannerConfig()

    def plan(self, request: PlanningRequest) -> PlanningResult:
        endpoints = list(request.endpoints)
        if self.config.deterministic:
            endpoints.sort(key=lambda e: (e.model, e.endpoint))

        planned_endpoints: List[EndpointPlan] = []
        for endpoint in endpoints:
            choice = self._choose_quantization(endpoint)
            autoscaling = self._build_autoscaling(endpoint, choice)
            planned_cost = autoscaling.target_replicas * choice.cost_per_replica
            endpoint_plan = EndpointPlan(
                endpoint=endpoint,
                autoscaling=autoscaling,
                quantization=choice,
                baseline_cost=endpoint.baseline_cost,
                planned_cost=planned_cost,
                latency_headroom_ms=endpoint.slo_latency_ms - choice.latency_ms,
                accuracy_headroom=choice.accuracy - endpoint.slo_accuracy,
            )
            planned_endpoints.append(endpoint_plan)

        summary = PlanningSummary(planned_endpoints)
        metadata = {
            "generated_at": request.metadata.get("generated_at"),
            "utilization_target": self.config.target_utilization,
            "scale_buffer": self.config.scale_buffer,
        }
        return PlanningResult(summary=summary, metadata=metadata)

    def simulate(self, request: PlanningRequest, load_multipliers: Iterable[float]) -> Dict[str, List[Dict[str, float]]]:
        result = self.plan(request)
        simulations: Dict[str, List[Dict[str, float]]] = {}
        for plan in result.summary.plans:
            endpoint_key = f"{plan.endpoint.model}:{plan.endpoint.endpoint}"
            series: List[Dict[str, float]] = []
            for multiplier in load_multipliers:
                simulated_qps = plan.endpoint.projected_qps * multiplier
                effective_capacity = plan.quantization.qps_capacity * plan.autoscaling.target_replicas
                utilization = simulated_qps / effective_capacity if effective_capacity else 0
                latency = plan.quantization.latency_ms * min(utilization / self.config.target_utilization, 1)
                series.append(
                    {
                        "load_multiplier": multiplier,
                        "utilization": round(utilization, 4),
                        "latency_ms": round(latency, 2),
                    }
                )
            simulations[endpoint_key] = series
        return simulations

    def _choose_quantization(self, endpoint: EndpointState) -> QuantizationChoice:
        feasible = [
            option
            for option in endpoint.quantization_options
            if option.satisfies(endpoint.slo_latency_ms, endpoint.slo_accuracy)
        ]
        if not feasible:
            raise ValueError(
                f"No quantization option can satisfy SLOs for {endpoint.model}:{endpoint.endpoint}"
            )
        if self.config.deterministic:
            feasible.sort(key=lambda opt: opt.name)

        best_choice: QuantizationChoice | None = None
        best_cost = math.inf
        for option in feasible:
            replicas_needed = self._replicas_needed(endpoint.projected_qps, option.qps_capacity)
            total_cost = replicas_needed * option.cost_per_replica
            if total_cost < best_cost - 1e-6:  # deterministic tie-breaking
                best_cost = total_cost
                best_choice = QuantizationChoice(
                    name=option.name,
                    latency_ms=option.latency_ms,
                    accuracy=option.accuracy,
                    qps_capacity=option.qps_capacity,
                    cost_per_replica=option.cost_per_replica,
                    expected_savings=endpoint.baseline_cost - total_cost,
                )
        assert best_choice is not None
        return best_choice

    def _build_autoscaling(self, endpoint: EndpointState, choice: QuantizationChoice) -> AutoscalingPlan:
        replicas_needed = self._replicas_needed(endpoint.projected_qps, choice.qps_capacity)
        min_replicas = max(self.config.min_replicas_floor, min(replicas_needed, endpoint.baseline_replicas))
        max_replicas = max(min_replicas, int(math.ceil(replicas_needed * self.config.scale_buffer)))
        return AutoscalingPlan(
            min_replicas=min_replicas,
            max_replicas=max_replicas,
            target_replicas=replicas_needed,
            target_utilization=self.config.target_utilization,
        )

    def _replicas_needed(self, projected_qps: float, qps_capacity: float) -> int:
        """Compute replicas required to satisfy the projected QPS.

        The planner treats ``qps_capacity`` as the sustainable throughput per
        replica once the target utilization policy has been applied. This keeps
        the replica calculation aligned with historical measurements while the
        utilization knob is still exposed through the emitted HPA configuration.
        """

        raw = projected_qps / max(qps_capacity, 1e-9)
        return max(1, int(math.ceil(raw)))

    @staticmethod
    def load_request(path: str | Path) -> PlanningRequest:
        payload = json.loads(Path(path).read_text())
        endpoints = [_parse_endpoint(item) for item in payload["endpoints"]]
        metadata = payload.get("metadata", {})
        return PlanningRequest(endpoints=endpoints, metadata=metadata)


def _parse_endpoint(payload: Dict[str, object]) -> EndpointState:
    options = [
        QuantizationOption(
            name=opt["name"],
            latency_ms=float(opt["latency_ms"]),
            accuracy=float(opt["accuracy"]),
            qps_capacity=float(opt["qps_capacity"]),
            cost_per_replica=float(opt["cost_per_replica"]),
            notes=opt.get("notes", ""),
        )
        for opt in payload["quantization_options"]
    ]
    return EndpointState(
        model=str(payload["model"]),
        endpoint=str(payload["endpoint"]),
        baseline_replicas=int(payload["baseline_replicas"]),
        baseline_latency_ms=float(payload["baseline_latency_ms"]),
        baseline_accuracy=float(payload["baseline_accuracy"]),
        baseline_cost_per_replica=float(payload["baseline_cost_per_replica"]),
        qps_capacity=float(payload["qps_capacity"]),
        slo_latency_ms=float(payload["slo_latency_ms"]),
        slo_accuracy=float(payload["slo_accuracy"]),
        projected_qps=float(payload["projected_qps"]),
        quantization_options=options,
        metadata={str(k): str(v) for k, v in payload.get("metadata", {}).items()},
    )

