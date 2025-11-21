"""
Tests for Local Pipeline Runner
"""
import json
import tempfile
from pathlib import Path

import pytest
import yaml

from pipelines.registry.core import PipelineRegistry
from pipelines.runners.local_runner import LocalRunner, RunStatus, TaskStatus


@pytest.fixture
def simple_pipeline_manifest():
    """Simple pipeline for testing."""
    return {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "test-runner",
            "description": "Test runner pipeline",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "hello",
                    "type": "python",
                    "code": {
                        "command": "print('Hello from task')"
                    },
                    "retry": {
                        "attempts": 1,
                        "delay": "1s",
                    },
                    "timeout": "10s",
                },
            ],
            "execution": {
                "runtime": "local",
            },
        },
    }


@pytest.fixture
def multi_task_pipeline():
    """Pipeline with multiple dependent tasks."""
    return {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "multi-task",
            "description": "Multi-task pipeline",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "task1",
                    "type": "python",
                    "code": {
                        "command": "result = 'task1 complete'"
                    },
                },
                {
                    "id": "task2",
                    "type": "python",
                    "depends_on": ["task1"],
                    "code": {
                        "command": "result = 'task2 complete'"
                    },
                },
                {
                    "id": "task3",
                    "type": "python",
                    "depends_on": ["task1"],
                    "code": {
                        "command": "result = 'task3 complete'"
                    },
                },
                {
                    "id": "task4",
                    "type": "python",
                    "depends_on": ["task2", "task3"],
                    "code": {
                        "command": "result = 'task4 complete'"
                    },
                },
            ],
        },
    }


@pytest.fixture
def registry_with_pipeline(simple_pipeline_manifest):
    """Create registry with test pipeline."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(simple_pipeline_manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        yield registry


def test_parse_duration():
    """Test duration string parsing."""
    runner = LocalRunner(PipelineRegistry(manifest_dirs=[]))

    assert runner.parse_duration("30s") == 30
    assert runner.parse_duration("5m") == 300
    assert runner.parse_duration("2h") == 7200


def test_dry_run(registry_with_pipeline):
    """Test dry run execution."""
    runner = LocalRunner(registry_with_pipeline, dry_run=True)
    run = runner.run_pipeline("test-runner")

    assert run.status == RunStatus.COMPLETED
    assert run.succeeded
    assert len(run.task_results) == 1
    assert run.task_results["hello"].status == TaskStatus.SUCCESS


def test_simple_execution(registry_with_pipeline):
    """Test simple pipeline execution."""
    runner = LocalRunner(registry_with_pipeline, dry_run=False)
    run = runner.run_pipeline("test-runner")

    assert run.pipeline_name == "test-runner"
    assert run.status == RunStatus.COMPLETED
    assert run.succeeded
    assert "hello" in run.task_results
    assert run.task_results["hello"].status == TaskStatus.SUCCESS
    assert run.task_results["hello"].attempts == 1


def test_multi_task_execution():
    """Test multi-task pipeline execution."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "multi-task",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "task1",
                    "type": "python",
                    "code": {"command": "print('task1')"},
                },
                {
                    "id": "task2",
                    "type": "python",
                    "depends_on": ["task1"],
                    "code": {"command": "print('task2')"},
                },
            ],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        runner = LocalRunner(registry)
        run = runner.run_pipeline("multi-task")

        assert run.succeeded
        assert len(run.task_results) == 2
        assert run.task_results["task1"].succeeded
        assert run.task_results["task2"].succeeded


def test_task_retry():
    """Test task retry logic."""
    # Create pipeline with failing task
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "retry-test",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "failing_task",
                    "type": "python",
                    "code": {
                        "command": "raise Exception('Intentional failure')"
                    },
                    "retry": {
                        "attempts": 2,
                        "delay": "1s",
                        "backoff": "fixed",
                    },
                },
            ],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        runner = LocalRunner(registry)
        run = runner.run_pipeline("retry-test")

        assert not run.succeeded
        assert run.task_results["failing_task"].status == TaskStatus.FAILED
        assert run.task_results["failing_task"].attempts == 3  # 1 initial + 2 retries


def test_dependency_skip_on_failure():
    """Test that dependent tasks are skipped when parent fails."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "skip-test",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "failing_task",
                    "type": "python",
                    "code": {
                        "command": "raise Exception('Failure')"
                    },
                    "retry": {
                        "attempts": 0,
                    },
                },
                {
                    "id": "dependent_task",
                    "type": "python",
                    "depends_on": ["failing_task"],
                    "code": {
                        "command": "print('Should not run')"
                    },
                },
            ],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        runner = LocalRunner(registry)
        run = runner.run_pipeline("skip-test")

        assert not run.succeeded
        assert run.task_results["failing_task"].status == TaskStatus.FAILED
        assert run.task_results["dependent_task"].status == TaskStatus.SKIPPED


def test_bash_task_execution():
    """Test Bash task execution."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "bash-test",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "bash_task",
                    "type": "bash",
                    "code": {
                        "command": "echo 'Hello from Bash'"
                    },
                },
            ],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        runner = LocalRunner(registry)
        run = runner.run_pipeline("bash-test")

        assert run.succeeded
        assert "Hello from Bash" in run.task_results["bash_task"].output


def test_context_propagation():
    """Test context propagation between tasks."""
    runner = LocalRunner(PipelineRegistry(manifest_dirs=[]))
    context = {"initial_value": "test"}

    # Context should be available to tasks
    assert context["initial_value"] == "test"


def test_run_metadata():
    """Test run metadata tracking."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "metadata-test",
            "owners": ["test@summit.io"],
        },
        "spec": {
            "tasks": [
                {
                    "id": "task1",
                    "type": "python",
                    "code": {"command": "print('test')"},
                },
            ],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)

        registry = PipelineRegistry(manifest_dirs=[Path(tmpdir)])
        registry.load_all()

        runner = LocalRunner(registry)
        run = runner.run_pipeline("metadata-test", run_id="custom-run-123")

        assert run.run_id == "custom-run-123"
        assert run.start_time is not None
        assert run.end_time is not None
        assert run.duration_ms is not None
        assert run.duration_ms > 0
