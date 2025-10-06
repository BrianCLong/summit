"""Chaos engineering orchestration utilities.

The runner ingests the declarative suite defined in ``ops/chaos/experiments.yaml``
and coordinates failure injection via ``ops.chaos_hooks``.  It focuses on
actionable outcomes: experiments run sequentially, compound scenarios can stitch
multiple experiments together, and the final report rolls up success rates
against baseline SLO expectations so program managers can gate releases.
"""

from __future__ import annotations

import logging
import math
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import yaml

from ops import chaos_hooks

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ChaosExperimentSpec:
    """Normalized definition of an experiment from the YAML suite."""

    name: str
    description: str
    type: str
    target: Dict[str, Any]
    fault_injection: Dict[str, Any]
    expected_behavior: Sequence[Any] = field(default_factory=list)
    success_criteria: Sequence[Any] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "ChaosExperimentSpec":
        known_keys = {
            "name",
            "description",
            "type",
            "target",
            "fault_injection",
            "expected_behavior",
            "success_criteria",
        }
        missing = [key for key in ("name", "description", "type", "fault_injection") if key not in payload]
        if missing:
            raise ValueError(f"Experiment definition missing required keys: {missing}")

        target = payload.get("target", {})
        if not isinstance(target, dict):
            raise ValueError("target must be a mapping")

        fault_injection = payload["fault_injection"]
        if not isinstance(fault_injection, dict):
            raise ValueError("fault_injection must be a mapping")

        raw = {key: value for key, value in payload.items() if key not in known_keys}
        return cls(
            name=str(payload["name"]),
            description=str(payload["description"]),
            type=str(payload["type"]),
            target=target,
            fault_injection=fault_injection,
            expected_behavior=payload.get("expected_behavior", []) or [],
            success_criteria=payload.get("success_criteria", []) or [],
            raw=raw,
        )


@dataclass(slots=True)
class ChaosExperimentResult:
    """Outcome of an executed experiment."""

    name: str
    success: bool
    started_at: float
    finished_at: float
    hook_result: Optional[chaos_hooks.HookExecutionResult]
    notes: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    drill_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "name": self.name,
            "success": self.success,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "notes": list(self.notes),
            "metrics": dict(self.metrics),
        }
        if self.hook_result is not None:
            payload["hook"] = {
                "hook": self.hook_result.hook,
                "command": self.hook_result.command,
                "success": self.hook_result.success,
                "metadata": dict(self.hook_result.metadata),
                "duration_seconds": self.hook_result.duration_seconds,
            }
        if self.drill_type:
            payload["drill_type"] = self.drill_type
        return payload


@dataclass(slots=True)
class ChaosSuite:
    """Container for parsed chaos configuration."""

    experiments: List[ChaosExperimentSpec]
    compound: List[Dict[str, Any]]
    baseline: Dict[str, Any]
    validation: Dict[str, Any]


def _parse_duration_to_seconds(duration: str) -> int:
    match = re.fullmatch(r"(?P<value>\d+)(?P<unit>[smh])", duration.strip())
    if not match:
        raise ValueError(f"Unsupported duration format: {duration}")
    value = int(match.group("value"))
    unit = match.group("unit")
    multiplier = {"s": 1, "m": 60, "h": 3600}[unit]
    return value * multiplier


class ChaosRunner:
    """High-level orchestration for the chaos engineering framework."""

    def __init__(
        self,
        suite_path: Path,
        *,
        dry_run: bool = False,
        namespace: str = "default",
    ) -> None:
        self.suite_path = Path(suite_path)
        self.dry_run = dry_run
        self.namespace = namespace

    # Public API ---------------------------------------------------------
    def run_suite(
        self,
        *,
        experiment_names: Optional[Sequence[str]] = None,
        drill_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        suite = self._load_suite()
        filtered = self._filter_experiments(suite.experiments, experiment_names)
        allowed_names = (
            set(experiment_names)
            if experiment_names
            else {experiment.name for experiment in suite.experiments}
        )

        results: List[ChaosExperimentResult] = []
        for experiment in filtered:
            results.append(self._run_single_experiment(experiment, drill_type=drill_type))

        compound_results = self._run_compound_experiments(
            suite.compound,
            {experiment.name: experiment for experiment in suite.experiments},
            allowed_names=allowed_names,
            drill_type=drill_type,
        )
        results.extend(compound_results)

        summary = self._summarize_results(results, suite.baseline)
        summary["validation"] = suite.validation
        return {
            "experiments": [result.to_dict() for result in results],
            "summary": summary,
        }

    # Internal helpers ---------------------------------------------------
    def _load_suite(self) -> ChaosSuite:
        if not self.suite_path.exists():
            raise FileNotFoundError(f"Chaos suite not found at {self.suite_path}")

        with self.suite_path.open("r", encoding="utf-8") as handle:
            payload = yaml.safe_load(handle)

        if not isinstance(payload, dict):
            raise ValueError("Chaos suite must be a mapping at the top level")

        experiments_data = payload.get("experiments", [])
        experiments = [ChaosExperimentSpec.from_dict(item) for item in experiments_data]

        compound = payload.get("compound_experiments", []) or []
        baseline = payload.get("spec", {}).get("baseline", {}) or {}
        validation = payload.get("validation", {}) or {}

        return ChaosSuite(
            experiments=experiments,
            compound=list(compound),
            baseline=baseline,
            validation=validation,
        )

    def _filter_experiments(
        self,
        experiments: List[ChaosExperimentSpec],
        experiment_names: Optional[Sequence[str]],
    ) -> List[ChaosExperimentSpec]:
        if not experiment_names:
            return list(experiments)

        allowed = {name for name in experiment_names}
        filtered = [experiment for experiment in experiments if experiment.name in allowed]
        if not filtered:
            raise ValueError(f"No experiments matched filter {sorted(allowed)}")
        return filtered

    def _run_single_experiment(
        self,
        experiment: ChaosExperimentSpec,
        *,
        drill_type: Optional[str],
    ) -> ChaosExperimentResult:
        start_time = time.time()
        notes: List[str] = []
        hook_result: Optional[chaos_hooks.HookExecutionResult]

        try:
            hook_result = self._dispatch_fault(experiment)
            success = bool(hook_result.success if hook_result else False)
            if not success:
                notes.append("Hook execution failed")
        except Exception as exc:  # pragma: no cover - defensive logging path
            success = False
            hook_result = None
            notes.append(f"Experiment raised exception: {exc}")
            logger.exception("Chaos experiment %s failed", experiment.name)

        finished_at = time.time()
        metrics = {
            "duration_seconds": finished_at - start_time,
        }

        return ChaosExperimentResult(
            name=experiment.name,
            success=success,
            started_at=start_time,
            finished_at=finished_at,
            hook_result=hook_result,
            notes=notes,
            metrics=metrics,
            drill_type=drill_type,
        )

    def _run_compound_experiments(
        self,
        compound_definitions: Iterable[Dict[str, Any]],
        experiment_lookup: Dict[str, ChaosExperimentSpec],
        *,
        allowed_names: set[str],
        drill_type: Optional[str],
    ) -> List[ChaosExperimentResult]:
        results: List[ChaosExperimentResult] = []
        for definition in compound_definitions:
            name = definition.get("name")
            experiment_names = definition.get("experiments", [])
            delay = definition.get("cascade_delay", "0s")
            parsed_delay = 0
            if isinstance(delay, str) and delay:
                parsed_delay = _parse_duration_to_seconds(delay)

            if not set(experiment_names).issubset(allowed_names):
                logger.debug(
                    "Skipping compound experiment %s because not all members are selected",
                    name,
                )
                continue

            for index, experiment_name in enumerate(experiment_names):
                if experiment_name not in experiment_lookup:
                    raise ValueError(
                        f"Compound experiment '{name}' references unknown experiment '{experiment_name}'"
                    )

                if index > 0 and parsed_delay:
                    self._sleep(parsed_delay)

                base_experiment = experiment_lookup[experiment_name]
                compound_result = self._run_single_experiment(
                    base_experiment,
                    drill_type=drill_type or name,
                )
                compound_result.notes.append(f"Compound scenario: {name}")
                results.append(compound_result)

        return results

    def _dispatch_fault(self, experiment: ChaosExperimentSpec) -> Optional[chaos_hooks.HookExecutionResult]:
        fault_type = experiment.fault_injection.get("type")
        if not fault_type:
            raise ValueError(f"Experiment {experiment.name} missing fault injection type")

        target = experiment.target
        fault = experiment.fault_injection

        if fault_type == "pod_kill":
            pod = target.get("pod") or target.get("service")
            if not pod:
                raise ValueError(f"Experiment {experiment.name} missing pod/service target")
            return chaos_hooks.inject_pod_kill_hook(
                str(pod),
                namespace=self.namespace,
                delay_seconds=self._optional_int(fault.get("delay_seconds", 0)),
                dry_run=self.dry_run,
            )

        if fault_type == "network_partition":
            services = target.get("services") or [target.get("service")]
            services = [svc for svc in services if svc]
            return chaos_hooks.inject_network_partition(
                services,
                namespace=self.namespace,
                duration=str(fault.get("duration", "5m")),
                loss_percentage=int(fault.get("loss_percentage", 100)),
                dry_run=self.dry_run,
            )

        if fault_type == "latency_injection":
            service = target.get("service")
            return chaos_hooks.inject_latency_injection(
                str(service),
                namespace=self.namespace,
                delay=str(fault.get("delay", "2s")),
                duration=str(fault.get("duration", "5m")),
                dry_run=self.dry_run,
            )

        if fault_type == "traffic_spike":
            return chaos_hooks.inject_traffic_spike(
                str(target.get("service")),
                endpoint=str(target.get("endpoint", "/")),
                multiplier=int(fault.get("multiplier", 1)),
                duration_seconds=_parse_duration_to_seconds(str(fault.get("duration", "60s"))),
                base_url=target.get("base_url"),
                dry_run=self.dry_run,
            )

        if fault_type == "io_stress":
            return chaos_hooks.inject_io_stress(
                str(target.get("service")),
                namespace=self.namespace,
                read_percentage=int(fault.get("read_percentage", 50)),
                write_percentage=int(fault.get("write_percentage", 50)),
                duration_seconds=_parse_duration_to_seconds(str(fault.get("duration", "60s"))),
                dry_run=self.dry_run,
            )

        logger.warning("No dispatcher implemented for fault type '%s'", fault_type)
        return None

    def _summarize_results(
        self,
        results: List[ChaosExperimentResult],
        baseline: Dict[str, Any],
    ) -> Dict[str, Any]:
        total = len(results)
        successes = sum(1 for result in results if result.success)
        pass_rate = successes / total if total else 0.0

        slo_floor = float(baseline.get("slo_compliance", 0))
        meets_floor = pass_rate >= slo_floor if slo_floor else True

        return {
            "total_experiments": total,
            "successful_experiments": successes,
            "pass_rate": pass_rate,
            "meets_slo_floor": meets_floor,
            "baseline": baseline,
        }

    def _optional_int(self, value: Any) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    def _sleep(self, seconds: int) -> None:
        if seconds <= 0:
            return
        logger.debug("Waiting %s seconds between compound experiments", seconds)
        time.sleep(seconds)


# Convenience wrappers retained for legacy callers -----------------------
def run_pod_kill_chaos_test(
    target_pods: Sequence[str],
    *,
    namespace: str = "default",
    dry_run: bool = False,
) -> Dict[str, Any]:
    results = [
        chaos_hooks.inject_pod_kill_hook(pod, namespace=namespace, dry_run=dry_run)
        for pod in target_pods
    ]

    success = all(result.success for result in results)
    return {
        "status": "completed" if success else "failed",
        "results": [result.metadata for result in results],
        "success": success,
    }


def run_broker_kill_chaos_test(
    target_brokers: Sequence[str],
    *,
    namespace: str = "default",
    dry_run: bool = False,
) -> Dict[str, Any]:
    results = [
        chaos_hooks.inject_broker_kill_hook(broker, namespace=namespace, dry_run=dry_run)
        for broker in target_brokers
    ]

    success = all(result.success for result in results)
    return {
        "status": "completed" if success else "failed",
        "results": [result.metadata for result in results],
        "success": success,
    }


def simulate_pitr_recovery(backup_id: str, *, allow_empty: bool = False) -> bool:
    if not backup_id and not allow_empty:
        raise ValueError("backup_id is required for PITR simulation")

    logger.info("Simulating PITR recovery using backup '%s'", backup_id)
    time.sleep(0.1)
    checksum = sum(ord(char) for char in backup_id) % 97 if backup_id else 0
    return checksum % 2 == 0


def simulate_cross_region_failover(region_a: str, region_b: str, *, dry_run: bool = True) -> bool:
    if not region_a or not region_b:
        raise ValueError("Both regions must be provided for failover simulation")

    logger.info("Simulating cross-region failover %s -> %s", region_a, region_b)
    if dry_run:
        return True

    time.sleep(0.2)
    entropy = math.fabs(hash((region_a, region_b))) % 10
    return entropy < 8


__all__ = [
    "ChaosRunner",
    "ChaosExperimentResult",
    "ChaosExperimentSpec",
    "ChaosSuite",
    "run_pod_kill_chaos_test",
    "run_broker_kill_chaos_test",
    "simulate_pitr_recovery",
    "simulate_cross_region_failover",
]
