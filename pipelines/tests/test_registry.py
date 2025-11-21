"""
Tests for Pipeline Registry
"""
import json
import tempfile
from pathlib import Path

import pytest
import yaml

from pipelines.registry.core import Pipeline, PipelineRegistry


@pytest.fixture
def sample_manifest():
    """Sample valid pipeline manifest."""
    return {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {
            "name": "test-pipeline",
            "description": "Test pipeline",
            "owners": ["test-team@summit.io"],
            "tags": {
                "domain": "test",
                "criticality": "low",
            },
            "annotations": {
                "source": "test",
            },
        },
        "spec": {
            "schedule": {
                "cron": "0 * * * *",
                "timezone": "UTC",
                "enabled": True,
            },
            "inputs": [
                {
                    "name": "test_input",
                    "namespace": "s3://test-bucket/input",
                }
            ],
            "outputs": [
                {
                    "name": "test_output",
                    "namespace": "s3://test-bucket/output",
                }
            ],
            "tasks": [
                {
                    "id": "task1",
                    "name": "Task 1",
                    "type": "python",
                    "code": {
                        "module": "test.module",
                        "function": "test_function",
                    },
                },
                {
                    "id": "task2",
                    "name": "Task 2",
                    "type": "bash",
                    "depends_on": ["task1"],
                    "code": {
                        "command": "echo 'test'",
                    },
                },
            ],
            "execution": {
                "runtime": "local",
            },
        },
    }


@pytest.fixture
def temp_manifest_dir(sample_manifest):
    """Create temporary directory with manifest file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = Path(tmpdir) / "test-pipeline.yaml"

        with open(manifest_path, "w") as f:
            yaml.dump(sample_manifest, f)

        yield Path(tmpdir)


def test_parse_pipeline(sample_manifest):
    """Test parsing manifest into Pipeline object."""
    registry = PipelineRegistry(manifest_dirs=[])
    pipeline = registry.parse_pipeline(sample_manifest)

    assert pipeline.name == "test-pipeline"
    assert pipeline.description == "Test pipeline"
    assert pipeline.owners == ["test-team@summit.io"]
    assert pipeline.tags["domain"] == "test"
    assert len(pipeline.tasks) == 2
    assert pipeline.runtime == "local"


def test_task_graph():
    """Test task dependency graph construction."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "test"},
        "spec": {
            "tasks": [
                {"id": "a", "type": "python", "code": {}},
                {"id": "b", "type": "python", "depends_on": ["a"], "code": {}},
                {"id": "c", "type": "python", "depends_on": ["a"], "code": {}},
                {"id": "d", "type": "python", "depends_on": ["b", "c"], "code": {}},
            ]
        },
    }

    registry = PipelineRegistry(manifest_dirs=[])
    pipeline = registry.parse_pipeline(manifest)

    graph = pipeline.task_graph
    assert graph["a"] == []
    assert graph["b"] == ["a"]
    assert graph["c"] == ["a"]
    assert graph["d"] == ["b", "c"]


def test_topological_sort():
    """Test topological sort of tasks."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "test"},
        "spec": {
            "tasks": [
                {"id": "a", "type": "python", "code": {}},
                {"id": "b", "type": "python", "depends_on": ["a"], "code": {}},
                {"id": "c", "type": "python", "depends_on": ["b"], "code": {}},
            ]
        },
    }

    registry = PipelineRegistry(manifest_dirs=[])
    pipeline = registry.parse_pipeline(manifest)

    order = pipeline.topological_sort()
    assert order == ["a", "b", "c"]


def test_topological_sort_with_cycle():
    """Test cycle detection in task dependencies."""
    manifest = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "test"},
        "spec": {
            "tasks": [
                {"id": "a", "type": "python", "depends_on": ["b"], "code": {}},
                {"id": "b", "type": "python", "depends_on": ["a"], "code": {}},
            ]
        },
    }

    registry = PipelineRegistry(manifest_dirs=[])
    pipeline = registry.parse_pipeline(manifest)

    with pytest.raises(ValueError, match="Cycle detected"):
        pipeline.topological_sort()


def test_load_manifest_yaml(temp_manifest_dir):
    """Test loading YAML manifest."""
    registry = PipelineRegistry(manifest_dirs=[temp_manifest_dir])
    manifests = registry.discover_manifests()

    assert len(manifests) == 1
    manifest = registry.load_manifest(manifests[0])

    assert manifest["metadata"]["name"] == "test-pipeline"


def test_registry_load_all(temp_manifest_dir):
    """Test loading all manifests into registry."""
    registry = PipelineRegistry(manifest_dirs=[temp_manifest_dir])
    count = registry.load_all()

    assert count == 1
    pipeline = registry.get("test-pipeline")
    assert pipeline is not None
    assert pipeline.name == "test-pipeline"


def test_registry_filters(temp_manifest_dir):
    """Test registry filtering methods."""
    registry = PipelineRegistry(manifest_dirs=[temp_manifest_dir])
    registry.load_all()

    # Filter by tags
    filtered = registry.filter_by_tags(domain="test")
    assert len(filtered) == 1
    assert filtered[0].name == "test-pipeline"

    # Filter by owner
    filtered = registry.filter_by_owner("test-team@summit.io")
    assert len(filtered) == 1

    # Filter by runtime
    filtered = registry.filter_by_runtime("local")
    assert len(filtered) == 1


def test_registry_scheduled_pipelines(temp_manifest_dir):
    """Test getting scheduled pipelines."""
    registry = PipelineRegistry(manifest_dirs=[temp_manifest_dir])
    registry.load_all()

    scheduled = registry.get_scheduled_pipelines()
    assert len(scheduled) == 1
    assert scheduled[0].schedule["cron"] == "0 * * * *"


def test_dependency_analysis(temp_manifest_dir):
    """Test cross-pipeline dependency analysis."""
    # Create two manifests with dependencies
    manifest1 = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "producer"},
        "spec": {
            "outputs": [
                {"name": "data", "namespace": "s3://bucket/data"}
            ],
            "tasks": [{"id": "task1", "type": "python", "code": {}}],
        },
    }

    manifest2 = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "consumer"},
        "spec": {
            "inputs": [
                {"name": "data", "namespace": "s3://bucket/data"}
            ],
            "tasks": [{"id": "task1", "type": "python", "code": {}}],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        with open(tmppath / "producer.yaml", "w") as f:
            yaml.dump(manifest1, f)

        with open(tmppath / "consumer.yaml", "w") as f:
            yaml.dump(manifest2, f)

        registry = PipelineRegistry(manifest_dirs=[tmppath])
        registry.load_all()

        deps = registry.analyze_dependencies()

        assert "s3://bucket/data" in deps["producers"]
        assert deps["producers"]["s3://bucket/data"] == "producer"
        assert "consumer" in deps["consumers"]["s3://bucket/data"]


def test_find_downstream_pipelines():
    """Test finding downstream pipelines."""
    manifest1 = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "producer"},
        "spec": {
            "outputs": [
                {"name": "data", "namespace": "s3://bucket/data"}
            ],
            "tasks": [{"id": "task1", "type": "python", "code": {}}],
        },
    }

    manifest2 = {
        "apiVersion": "summit.io/v1",
        "kind": "Pipeline",
        "metadata": {"name": "consumer"},
        "spec": {
            "inputs": [
                {"name": "data", "namespace": "s3://bucket/data"}
            ],
            "tasks": [{"id": "task1", "type": "python", "code": {}}],
        },
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        with open(tmppath / "producer.yaml", "w") as f:
            yaml.dump(manifest1, f)

        with open(tmppath / "consumer.yaml", "w") as f:
            yaml.dump(manifest2, f)

        registry = PipelineRegistry(manifest_dirs=[tmppath])
        registry.load_all()

        downstream = registry.find_downstream_pipelines("producer")
        assert "consumer" in downstream


def test_export_summary(temp_manifest_dir):
    """Test exporting registry summary."""
    registry = PipelineRegistry(manifest_dirs=[temp_manifest_dir])
    registry.load_all()

    summary = registry.export_summary()

    assert summary["total_pipelines"] == 1
    assert "runtimes" in summary
    assert summary["scheduled"] == 1
    assert "tags" in summary
    assert "domain" in summary["tags"]
    assert "test" in summary["tags"]["domain"]
