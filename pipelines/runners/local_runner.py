"""
Local Pipeline Runner

Executes pipeline manifests locally or in CI environments.
Supports Python, Bash, and Node tasks with retry logic and OpenLineage tracking.
"""
import asyncio
import importlib
import json
import logging
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from pipelines.registry.core import Pipeline, PipelineRegistry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class RunStatus(Enum):
    """Pipeline run status."""
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TaskResult:
    """Result of a task execution."""
    task_id: str
    status: TaskStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: Optional[int] = None
    attempts: int = 0
    error: Optional[str] = None
    output: Any = None

    @property
    def succeeded(self) -> bool:
        return self.status == TaskStatus.SUCCESS


@dataclass
class PipelineRun:
    """Represents a pipeline execution run."""
    pipeline_name: str
    run_id: str
    status: RunStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    task_results: Dict[str, TaskResult] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_ms(self) -> Optional[int]:
        if self.end_time and self.start_time:
            delta = self.end_time - self.start_time
            return int(delta.total_seconds() * 1000)
        return None

    @property
    def succeeded(self) -> bool:
        return self.status == RunStatus.COMPLETED and all(
            r.succeeded for r in self.task_results.values()
        )


class OpenLineageEmitter:
    """Emits OpenLineage events for pipeline runs."""

    def __init__(self, enabled: bool = True, namespace: str = "summit-local"):
        self.enabled = enabled
        self.namespace = namespace
        self.ol_url = os.getenv("OPENLINEAGE_URL", "http://localhost:5000")
        self.ol_api_key = os.getenv("OPENLINEAGE_API_KEY", "")

    def emit_run_start(self, pipeline: Pipeline, run: PipelineRun):
        """Emit pipeline run start event."""
        if not self.enabled:
            return

        event = {
            "eventType": "START",
            "eventTime": run.start_time.isoformat(),
            "run": {
                "runId": run.run_id,
            },
            "job": {
                "namespace": self.namespace,
                "name": pipeline.name,
                "facets": {
                    "documentation": {
                        "_producer": "summit-pipeline-runner",
                        "description": pipeline.description,
                    },
                    "ownership": {
                        "_producer": "summit-pipeline-runner",
                        "owners": [{"name": owner} for owner in pipeline.owners],
                    },
                },
            },
            "inputs": [
                {
                    "namespace": inp.get("namespace", ""),
                    "name": inp.get("name", ""),
                }
                for inp in pipeline.inputs
            ],
            "outputs": [
                {
                    "namespace": out.get("namespace", ""),
                    "name": out.get("name", ""),
                }
                for out in pipeline.outputs
            ],
        }

        self._send_event(event)

    def emit_run_complete(self, pipeline: Pipeline, run: PipelineRun):
        """Emit pipeline run complete event."""
        if not self.enabled:
            return

        event = {
            "eventType": "COMPLETE" if run.succeeded else "FAIL",
            "eventTime": run.end_time.isoformat() if run.end_time else datetime.now(timezone.utc).isoformat(),
            "run": {
                "runId": run.run_id,
                "facets": {
                    "processing": {
                        "_producer": "summit-pipeline-runner",
                        "durationMs": run.duration_ms,
                    },
                },
            },
            "job": {
                "namespace": self.namespace,
                "name": pipeline.name,
            },
            "inputs": [
                {
                    "namespace": inp.get("namespace", ""),
                    "name": inp.get("name", ""),
                }
                for inp in pipeline.inputs
            ],
            "outputs": [
                {
                    "namespace": out.get("namespace", ""),
                    "name": out.get("name", ""),
                }
                for out in pipeline.outputs
            ],
        }

        self._send_event(event)

    def _send_event(self, event: Dict[str, Any]):
        """Send event to OpenLineage server."""
        try:
            import requests

            headers = {"Content-Type": "application/json"}
            if self.ol_api_key:
                headers["Authorization"] = f"Bearer {self.ol_api_key}"

            response = requests.post(
                f"{self.ol_url}/api/v1/lineage",
                json=event,
                headers=headers,
                timeout=5,
            )
            response.raise_for_status()
            logger.debug(f"Sent OpenLineage event: {event['eventType']}")

        except Exception as e:
            logger.warning(f"Failed to send OpenLineage event: {e}")


class LocalRunner:
    """
    Local pipeline runner.
    Executes pipeline tasks in topological order with retry logic.
    """

    def __init__(self, registry: PipelineRegistry, dry_run: bool = False):
        self.registry = registry
        self.dry_run = dry_run
        self.lineage_emitter = OpenLineageEmitter()

    def parse_duration(self, duration_str: str) -> int:
        """Parse duration string to seconds (e.g., '5m' -> 300)."""
        if not duration_str:
            return 0

        unit = duration_str[-1]
        value = int(duration_str[:-1])

        if unit == "s":
            return value
        elif unit == "m":
            return value * 60
        elif unit == "h":
            return value * 3600
        else:
            raise ValueError(f"Invalid duration unit: {unit}")

    def execute_python_task(
        self, task: Dict[str, Any], context: Dict[str, Any]
    ) -> Any:
        """Execute a Python task."""
        code_config = task.get("code", {})

        # Get module and function
        module_path = code_config.get("module")
        function_name = code_config.get("function")
        script_path = code_config.get("script")

        if module_path and function_name:
            # Import and call function
            module = importlib.import_module(module_path)
            func = getattr(module, function_name)

            # Merge params and context
            params = task.get("params", {})
            merged_params = {**context, **params}

            # Execute
            return func(**merged_params)

        elif script_path:
            # Execute Python script
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                env={**os.environ, **task.get("env", {})},
            )

            if result.returncode != 0:
                raise RuntimeError(f"Script failed: {result.stderr}")

            return result.stdout

        else:
            raise ValueError("Python task must specify module+function or script")

    def execute_bash_task(
        self, task: Dict[str, Any], context: Dict[str, Any]
    ) -> str:
        """Execute a Bash task."""
        code_config = task.get("code", {})
        command = code_config.get("command") or code_config.get("script")

        if not command:
            raise ValueError("Bash task must specify command or script")

        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            env={**os.environ, **task.get("env", {})},
        )

        if result.returncode != 0:
            raise RuntimeError(f"Command failed: {result.stderr}")

        return result.stdout

    def execute_node_task(
        self, task: Dict[str, Any], context: Dict[str, Any]
    ) -> str:
        """Execute a Node.js task."""
        code_config = task.get("code", {})
        script_path = code_config.get("script")

        if not script_path:
            raise ValueError("Node task must specify script")

        result = subprocess.run(
            ["node", script_path],
            capture_output=True,
            text=True,
            env={**os.environ, **task.get("env", {})},
        )

        if result.returncode != 0:
            raise RuntimeError(f"Script failed: {result.stderr}")

        return result.stdout

    def execute_task(
        self, task: Dict[str, Any], context: Dict[str, Any]
    ) -> TaskResult:
        """
        Execute a single task with retry logic.
        """
        task_id = task["id"]
        task_type = task["type"]
        retry_config = task.get("retry", {})
        max_attempts = retry_config.get("attempts", 3) + 1
        delay_str = retry_config.get("delay", "5m")
        backoff = retry_config.get("backoff", "exponential")

        result = TaskResult(task_id=task_id, status=TaskStatus.PENDING)

        logger.info(f"▶️  Executing task: {task_id} ({task_type})")

        if self.dry_run:
            logger.info(f"   [DRY RUN] Would execute {task_type} task")
            result.status = TaskStatus.SUCCESS
            return result

        # Retry loop
        delay_seconds = self.parse_duration(delay_str)
        attempt = 0

        while attempt < max_attempts:
            attempt += 1
            result.attempts = attempt
            result.start_time = datetime.now(timezone.utc)

            try:
                # Execute based on task type
                if task_type == "python":
                    output = self.execute_python_task(task, context)
                elif task_type == "bash":
                    output = self.execute_bash_task(task, context)
                elif task_type == "node":
                    output = self.execute_node_task(task, context)
                else:
                    raise ValueError(f"Unsupported task type: {task_type}")

                result.end_time = datetime.now(timezone.utc)
                result.duration_ms = int(
                    (result.end_time - result.start_time).total_seconds() * 1000
                )
                result.status = TaskStatus.SUCCESS
                result.output = output

                logger.info(f"✅ Task succeeded: {task_id} (attempt {attempt})")
                return result

            except Exception as e:
                result.end_time = datetime.now(timezone.utc)
                result.duration_ms = int(
                    (result.end_time - result.start_time).total_seconds() * 1000
                )
                result.error = str(e)

                if attempt < max_attempts:
                    # Calculate backoff delay
                    if backoff == "exponential":
                        wait_time = delay_seconds * (2 ** (attempt - 1))
                    else:
                        wait_time = delay_seconds

                    logger.warning(
                        f"⚠️  Task failed (attempt {attempt}/{max_attempts}): {task_id} - {e}"
                    )
                    logger.info(f"   Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    result.status = TaskStatus.FAILED
                    logger.error(f"❌ Task failed after {attempt} attempts: {task_id} - {e}")
                    return result

        return result

    def run_pipeline(
        self,
        pipeline_name: str,
        context: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None,
    ) -> PipelineRun:
        """
        Execute a pipeline by name.

        Args:
            pipeline_name: Name of pipeline to execute
            context: Optional execution context/parameters
            run_id: Optional run ID (generated if not provided)

        Returns:
            PipelineRun with execution results
        """
        # Get pipeline
        pipeline = self.registry.get(pipeline_name)
        if not pipeline:
            raise ValueError(f"Pipeline not found: {pipeline_name}")

        # Create run
        if not run_id:
            run_id = f"{pipeline_name}-{int(time.time())}"

        run = PipelineRun(
            pipeline_name=pipeline_name,
            run_id=run_id,
            status=RunStatus.RUNNING,
            start_time=datetime.now(timezone.utc),
            context=context or {},
        )

        logger.info(f"🚀 Starting pipeline: {pipeline_name} (run_id: {run_id})")

        # Emit start event
        ol_config = pipeline.spec.get("observability", {}).get("openlineage", {})
        if ol_config.get("enabled", True):
            self.lineage_emitter.namespace = ol_config.get("namespace", "summit-local")
            self.lineage_emitter.emit_run_start(pipeline, run)

        try:
            # Get task execution order
            task_order = pipeline.topological_sort()
            logger.info(f"📋 Task execution order: {' → '.join(task_order)}")

            # Execute tasks in order
            for task_id in task_order:
                # Find task spec
                task_spec = next(t for t in pipeline.tasks if t["id"] == task_id)

                # Check dependencies
                deps = task_spec.get("depends_on", [])
                failed_deps = [
                    dep for dep in deps
                    if run.task_results.get(dep) and not run.task_results[dep].succeeded
                ]

                if failed_deps:
                    logger.warning(f"⏭️  Skipping {task_id} due to failed dependencies: {failed_deps}")
                    run.task_results[task_id] = TaskResult(
                        task_id=task_id,
                        status=TaskStatus.SKIPPED,
                    )
                    continue

                # Execute task
                result = self.execute_task(task_spec, run.context)
                run.task_results[task_id] = result

                # Update context with task output
                if result.output is not None:
                    run.context[f"{task_id}_output"] = result.output

                # Stop on failure if no more retries
                if not result.succeeded:
                    logger.error(f"🛑 Stopping pipeline due to task failure: {task_id}")
                    break

            # Determine final status
            failed_tasks = [
                task_id for task_id, result in run.task_results.items()
                if result.status == TaskStatus.FAILED
            ]

            if failed_tasks:
                run.status = RunStatus.FAILED
                logger.error(f"❌ Pipeline failed. Failed tasks: {failed_tasks}")
            else:
                run.status = RunStatus.COMPLETED
                logger.info(f"✅ Pipeline completed successfully")

        except Exception as e:
            run.status = RunStatus.FAILED
            logger.error(f"❌ Pipeline failed with error: {e}")

        finally:
            run.end_time = datetime.now(timezone.utc)

            # Emit complete event
            if ol_config.get("enabled", True):
                self.lineage_emitter.emit_run_complete(pipeline, run)

            # Log summary
            logger.info(f"⏱️  Total duration: {run.duration_ms}ms")
            logger.info(f"📊 Task summary:")
            for task_id, result in run.task_results.items():
                status_icon = "✅" if result.succeeded else "❌" if result.status == TaskStatus.FAILED else "⏭️"
                logger.info(f"   {status_icon} {task_id}: {result.status.value} ({result.attempts} attempts)")

        return run


def main():
    """CLI entry point for local runner."""
    import argparse

    parser = argparse.ArgumentParser(description="Summit Pipeline Local Runner")
    parser.add_argument("pipeline", help="Pipeline name to execute")
    parser.add_argument("--dry-run", action="store_true", help="Dry run (don't execute)")
    parser.add_argument("--run-id", help="Custom run ID")
    parser.add_argument("--context", help="JSON context parameters")
    parser.add_argument("--manifest-dir", help="Pipeline manifest directory")
    parser.add_argument("--schema", help="Path to schema file")

    args = parser.parse_args()

    # Create registry
    from pipelines.registry.core import create_registry

    manifest_dirs = [args.manifest_dir] if args.manifest_dir else None
    registry = create_registry(manifest_dirs=manifest_dirs, schema_path=args.schema)

    # Parse context
    context = json.loads(args.context) if args.context else {}

    # Create runner
    runner = LocalRunner(registry, dry_run=args.dry_run)

    # Execute
    run = runner.run_pipeline(args.pipeline, context=context, run_id=args.run_id)

    # Exit with appropriate code
    sys.exit(0 if run.succeeded else 1)


if __name__ == "__main__":
    main()
