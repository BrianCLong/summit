from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from non_functional_targets.chaos_runner import ChaosRunner, run_pod_kill_chaos_test  # noqa: E402
from ops import chaos_hooks  # noqa: E402


class _StubHookResult(chaos_hooks.HookExecutionResult):
    def __init__(self, hook: str, metadata: dict | None = None) -> None:
        super().__init__(
            hook=hook,
            command=["echo", hook],
            success=True,
            stdout="",
            stderr="",
            duration_seconds=0.1,
            metadata=metadata or {},
        )


def _write_suite(tmp_path: Path) -> Path:
    payload = {
        "spec": {"baseline": {"slo_compliance": 0.5}},
        "experiments": [
            {
                "name": "pod-kill",
                "description": "kill pod",
                "type": "service_failure",
                "target": {"service": "api"},
                "fault_injection": {"type": "pod_kill"},
            },
            {
                "name": "latency",
                "description": "latency",
                "type": "network",
                "target": {"service": "gateway"},
                "fault_injection": {"type": "latency_injection", "delay": "1s"},
            },
        ],
        "compound_experiments": [
            {
                "name": "compound",
                "experiments": ["pod-kill", "latency"],
                "cascade_delay": "1s",
            }
        ],
        "validation": {"pre_experiment": ["health"]},
    }

    path = tmp_path / "suite.yaml"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _write_suite_with_recovery_targets(tmp_path: Path) -> Path:
    payload = {
        "spec": {"baseline": {"slo_compliance": 0.6}},
        "experiments": [
            {
                "name": "broker-kill",
                "description": "kill broker replica",
                "type": "service_failure",
                "target": {"broker": "broker-0"},
                "fault_injection": {
                    "type": "broker_kill",
                    "observed_rpo_seconds": 12,
                },
                "success_criteria": [
                    {"rto_seconds": "<=120"},
                    {"rpo_seconds": "<=60"},
                ],
            },
            {
                "name": "cross-region",
                "description": "validate replica promotion",
                "type": "resiliency",
                "target": {
                    "primary_region": "us-east-1",
                    "secondary_region": "us-west-2",
                    "replication_lag_seconds": 14,
                },
                "fault_injection": {
                    "type": "cross_region_failover",
                    "observed_rpo_seconds": 75,
                    "expected_failover_seconds": 240,
                },
                "success_criteria": [
                    {"rto_seconds": "<=180"},
                    {"rpo_seconds": "<=30"},
                ],
            },
            {
                "name": "pitr-drill",
                "description": "simulate PITR restore",
                "type": "backup",
                "target": {"backup_id": "backup-123"},
                "fault_injection": {
                    "type": "pitr_recovery",
                    "backup_id": "backup-123",
                    "target_timestamp": "2025-01-01T00:00:00Z",
                    "observed_rpo_seconds": 10,
                },
                "success_criteria": [
                    {"rto_seconds": "<=300"},
                    {"rpo_seconds": "<=120"},
                ],
            },
        ],
        "validation": {"pre_experiment": ["health"]},
    }

    path = tmp_path / "suite-rto-rpo.yaml"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


@pytest.fixture(autouse=True)
def patch_hooks(monkeypatch: pytest.MonkeyPatch) -> None:
    def _pod(*args, **kwargs):
        pod = args[0] if args else kwargs.get("pod_name", "api")
        return _StubHookResult("pod_kill", {"pod": pod})

    def _latency(*args, **kwargs):
        service = args[0] if args else kwargs.get("service", "gateway")
        return _StubHookResult("latency", {"service": service})

    def _network(*args, **kwargs):
        return _StubHookResult("network", {"services": "api"})

    def _broker(*args, **kwargs):
        return _StubHookResult("broker", {"broker": "broker-0"})

    monkeypatch.setattr(chaos_hooks, "inject_pod_kill_hook", _pod)
    monkeypatch.setattr(chaos_hooks, "inject_latency_injection", _latency)
    monkeypatch.setattr(chaos_hooks, "inject_network_partition", _network)
    monkeypatch.setattr(chaos_hooks, "inject_broker_kill_hook", _broker)
    monkeypatch.setattr(chaos_hooks, "inject_traffic_spike", _network)
    monkeypatch.setattr(chaos_hooks, "inject_io_stress", _network)


def test_run_suite_executes_and_summarises(tmp_path: Path) -> None:
    suite_path = _write_suite(tmp_path)
    runner = ChaosRunner(suite_path, dry_run=True, namespace="test")
    report = runner.run_suite()

    assert report["summary"]["total_experiments"] == 4
    assert report["summary"]["successful_experiments"] == 4
    assert report["summary"]["meets_slo_floor"] is True
    assert report["summary"]["rto_compliance"] is True
    assert report["summary"]["rpo_compliance"] is True


def test_run_suite_filters_by_name(tmp_path: Path) -> None:
    suite_path = _write_suite(tmp_path)
    runner = ChaosRunner(suite_path, dry_run=True)
    report = runner.run_suite(experiment_names=["pod-kill"])

    assert [item["name"] for item in report["experiments"]] == ["pod-kill"]


def test_legacy_pod_kill_helper_aggregates(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def _pod_kill(pod_name: str, **_: object) -> chaos_hooks.HookExecutionResult:
        calls.append(pod_name)
        return _StubHookResult("pod_kill", {"pod": pod_name})

    monkeypatch.setattr(chaos_hooks, "inject_pod_kill_hook", _pod_kill)
    summary = run_pod_kill_chaos_test(["api-0", "api-1"], namespace="chaos", dry_run=True)

    assert summary["status"] == "completed"
    assert calls == ["api-0", "api-1"]


def test_runner_tracks_rto_rpo_metrics(tmp_path: Path) -> None:
    suite_path = _write_suite_with_recovery_targets(tmp_path)
    runner = ChaosRunner(suite_path, dry_run=True, namespace="chaos")

    report = runner.run_suite()
    experiments = {item["name"]: item["metrics"] for item in report["experiments"]}

    assert experiments["broker-kill"]["rto_met"] is True
    assert experiments["cross-region"]["rpo_met"] is False
    assert experiments["pitr-drill"]["objectives_met"] is True
    assert report["summary"]["rto_compliance"] is False
    assert report["summary"]["rpo_compliance"] is False
