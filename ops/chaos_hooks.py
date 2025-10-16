"""Utilities for invoking chaos engineering hooks.

The original stubs only printed a message which made it impossible to reuse the
module when orchestrating real reliability drills.  The updated implementation
adds structured helpers that shell out to ``kubectl`` (or emit dry-run metadata
when a cluster is not available) so higher-level runners can coordinate chaos
experiments with consistent telemetry.
"""

from __future__ import annotations

import logging
import shlex
import shutil
import subprocess
import time
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


class ChaosHookError(RuntimeError):
    """Raised when a chaos hook fails to execute."""


@dataclass(slots=True)
class HookExecutionResult:
    """Structured result for all hook invocations."""

    hook: str
    command: list[str]
    success: bool
    stdout: str
    stderr: str
    duration_seconds: float
    metadata: dict[str, str] = field(default_factory=dict)


def _sleep(delay_seconds: int) -> None:
    if delay_seconds > 0:
        logger.debug("Sleeping %s seconds before executing chaos hook", delay_seconds)
        time.sleep(delay_seconds)


def _run_command(
    command: list[str],
    *,
    hook_name: str,
    dry_run: bool,
    timeout: int = 120,
    input_data: str | None = None,
    env: dict[str, str] | None = None,
) -> HookExecutionResult:
    """Run a shell command, supporting dry-run execution."""

    start = time.perf_counter()

    if dry_run:
        logger.info("[DRY-RUN] %s", shlex.join(command))
        return HookExecutionResult(
            hook=hook_name,
            command=command,
            success=True,
            stdout="",
            stderr="",
            duration_seconds=0.0,
        )

    binary = command[0]
    if shutil.which(binary) is None:
        raise ChaosHookError(f"Required binary '{binary}' not found on PATH for hook {hook_name}.")

    try:
        completed = subprocess.run(  # noqa: S603,S607 - intentional command execution
            command,
            check=False,
            capture_output=True,
            text=True,
            input=input_data,
            env=env,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:  # pragma: no cover - defensive guard
        raise ChaosHookError(f"Hook {hook_name} timed out after {timeout}s.") from exc

    duration = time.perf_counter() - start
    success = completed.returncode == 0

    if not success:
        logger.error(
            "Chaos hook %s failed (rc=%s): %s",
            hook_name,
            completed.returncode,
            completed.stderr.strip(),
        )

    return HookExecutionResult(
        hook=hook_name,
        command=command,
        success=success,
        stdout=completed.stdout,
        stderr=completed.stderr,
        duration_seconds=duration,
    )


def inject_pod_kill_hook(
    pod_name: str,
    *,
    namespace: str = "default",
    delay_seconds: int = 0,
    kubeconfig: Path | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Delete a pod immediately to simulate an abrupt crash."""

    if not pod_name:
        raise ValueError("pod_name is required for inject_pod_kill_hook")

    _sleep(delay_seconds)
    command = [
        "kubectl",
        "delete",
        "pod",
        pod_name,
        "--namespace",
        namespace,
        "--wait=false",
        "--grace-period=0",
        "--ignore-not-found",
    ]

    if kubeconfig:
        command.extend(["--kubeconfig", str(kubeconfig)])

    result = _run_command(
        command,
        hook_name="pod_kill",
        dry_run=dry_run,
    )
    result.metadata.update({"pod": pod_name, "namespace": namespace})
    return result


def inject_broker_kill_hook(
    broker_id: str,
    *,
    namespace: str = "default",
    statefulset: str = "broker",
    delay_seconds: int = 0,
    kubeconfig: Path | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Kill a broker pod (Kafka/Pulsar) by deleting the underlying replica."""

    if not broker_id:
        raise ValueError("broker_id is required for inject_broker_kill_hook")

    pod_name = broker_id
    if "/" not in broker_id and not broker_id.startswith(statefulset):
        pod_name = f"{statefulset}-{broker_id}"

    _sleep(delay_seconds)
    command = [
        "kubectl",
        "delete",
        "pod",
        pod_name,
        "--namespace",
        namespace,
        "--wait=false",
        "--grace-period=0",
        "--ignore-not-found",
    ]

    if kubeconfig:
        command.extend(["--kubeconfig", str(kubeconfig)])

    result = _run_command(
        command,
        hook_name="broker_kill",
        dry_run=dry_run,
    )
    result.metadata.update({"broker": broker_id, "namespace": namespace})
    return result


def inject_network_partition(
    services: Iterable[str],
    *,
    namespace: str = "default",
    duration: str = "5m",
    loss_percentage: int = 100,
    kubeconfig: Path | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Apply a chaos-mesh style NetworkChaos manifest for the provided services."""

    service_list = list(services)
    if not service_list:
        raise ValueError("At least one service is required for inject_network_partition")

    manifest = "\n".join(
        [
            "apiVersion: chaos-mesh.org/v1alpha1",
            "kind: NetworkChaos",
            "metadata:",
            f"  name: partition-{int(time.time())}",
            f"  namespace: {namespace}",
            "spec:",
            "  action: partition",
            "  mode: all",
            "  selector:",
            "    namespaces:",
        ]
        + [f"      - {namespace}"]
        + [
            "    pods:",
        ]
        + [f"      {svc}: ['*']" for svc in service_list]
        + [
            "  duration: " + duration,
            "  direction: both",
            "  target:",
            "    selector:",
            "      namespaces:",
        ]
        + [f"        - {namespace}"]
        + [
            "      pods:",
        ]
        + [f"        {svc}: ['*']" for svc in service_list]
        + [
            "    mode: all",
            f"  loss: {loss_percentage}%",
        ]
    )

    command = ["kubectl", "apply", "-f", "-"]
    if kubeconfig:
        command.extend(["--kubeconfig", str(kubeconfig)])

    result = _run_command(
        command,
        hook_name="network_partition",
        dry_run=dry_run,
        input_data=manifest,
    )
    result.metadata.update({"services": ",".join(service_list), "duration": duration})
    return result


def inject_latency_injection(
    service: str,
    *,
    namespace: str = "default",
    delay: str = "2s",
    duration: str = "5m",
    kubeconfig: Path | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Introduce deterministic latency to service traffic."""

    if not service:
        raise ValueError("service is required for inject_latency_injection")

    manifest = "\n".join(
        [
            "apiVersion: chaos-mesh.org/v1alpha1",
            "kind: NetworkChaos",
            "metadata:",
            f"  name: latency-{service}",
            f"  namespace: {namespace}",
            "spec:",
            "  action: delay",
            "  mode: all",
            "  selector:",
            "    namespaces:",
            f"      - {namespace}",
            "    pods:",
            f"      {service}: ['*']",
            "  delay:",
            f"    latency: {delay}",
            "  duration: " + duration,
        ]
    )

    command = ["kubectl", "apply", "-f", "-"]
    if kubeconfig:
        command.extend(["--kubeconfig", str(kubeconfig)])

    result = _run_command(
        command,
        hook_name="latency_injection",
        dry_run=dry_run,
        input_data=manifest,
    )
    result.metadata.update({"service": service, "delay": delay, "duration": duration})
    return result


def inject_traffic_spike(
    service: str,
    *,
    endpoint: str,
    multiplier: int,
    duration_seconds: int,
    base_url: str | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Generate synthetic load against a HTTP endpoint using ``hey``."""

    if multiplier < 1:
        raise ValueError("multiplier must be >= 1")

    url = endpoint
    if base_url:
        url = base_url.rstrip("/") + endpoint

    command = [
        "hey",
        "-z",
        f"{duration_seconds}s",
        "-c",
        str(max(1, multiplier * 10)),
        url,
    ]

    result = _run_command(
        command,
        hook_name="traffic_spike",
        dry_run=dry_run,
    )
    result.metadata.update(
        {"service": service, "endpoint": endpoint, "multiplier": str(multiplier)}
    )
    return result


def inject_io_stress(
    service: str,
    *,
    namespace: str = "default",
    read_percentage: int,
    write_percentage: int,
    duration_seconds: int,
    kubeconfig: Path | None = None,
    dry_run: bool = False,
) -> HookExecutionResult:
    """Stress disks for a service using ``stress-ng`` inside the pod."""

    if not service:
        raise ValueError("service is required for inject_io_stress")

    command = [
        "kubectl",
        "exec",
        f"deploy/{service}",
        "-n",
        namespace,
        "--",
        "stress-ng",
        "--hdd",
        "1",
        "--hdd-bytes",
        f"{write_percentage}%",
        "--metrics-brief",
        "--timeout",
        f"{duration_seconds}s",
    ]

    if kubeconfig:
        command.extend(["--kubeconfig", str(kubeconfig)])

    result = _run_command(
        command,
        hook_name="io_stress",
        dry_run=dry_run,
    )
    result.metadata.update(
        {
            "service": service,
            "read_pct": str(read_percentage),
            "write_pct": str(write_percentage),
            "duration": str(duration_seconds),
        }
    )
    return result


def trigger_chaos_drill(
    drill_type: str,
    target: str,
    *,
    suite_path: Path | None = None,
    namespace: str = "default",
    dry_run: bool = False,
) -> dict[str, object]:
    """Invoke the structured chaos runner for a specific drill target."""

    from non_functional_targets.chaos_runner import ChaosRunner  # Lazy import to avoid cycles

    path = suite_path or Path("ops/chaos/experiments.yaml")
    runner = ChaosRunner(path, dry_run=dry_run, namespace=namespace)
    logger.info("Triggering chaos drill '%s' for target '%s'", drill_type, target)
    return runner.run_suite(experiment_names=[target], drill_type=drill_type)


__all__ = [
    "ChaosHookError",
    "HookExecutionResult",
    "inject_broker_kill_hook",
    "inject_io_stress",
    "inject_latency_injection",
    "inject_network_partition",
    "inject_pod_kill_hook",
    "inject_traffic_spike",
    "trigger_chaos_drill",
]
