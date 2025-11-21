"""
Pipeline Registry Core

Unified registry for all orchestrated pipelines across Summit.
Loads, validates, and queries pipeline manifests.
"""
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import yaml
from jsonschema import Draft7Validator, ValidationError


@dataclass
class Pipeline:
    """Represents a pipeline manifest."""

    api_version: str
    kind: str
    name: str
    description: str
    owners: List[str]
    tags: Dict[str, str]
    annotations: Dict[str, str]
    spec: Dict[str, Any]
    source_file: Optional[Path] = None

    @property
    def tasks(self) -> List[Dict[str, Any]]:
        """Get pipeline tasks."""
        return self.spec.get("tasks", [])

    @property
    def schedule(self) -> Optional[Dict[str, Any]]:
        """Get pipeline schedule."""
        return self.spec.get("schedule")

    @property
    def inputs(self) -> List[Dict[str, str]]:
        """Get input datasets."""
        return self.spec.get("inputs", [])

    @property
    def outputs(self) -> List[Dict[str, str]]:
        """Get output datasets."""
        return self.spec.get("outputs", [])

    @property
    def runtime(self) -> str:
        """Get preferred execution runtime."""
        return self.spec.get("execution", {}).get("runtime", "maestro")

    @property
    def task_graph(self) -> Dict[str, List[str]]:
        """
        Build task dependency graph.
        Returns dict mapping task_id -> [dependent_task_ids]
        """
        graph = {}
        for task in self.tasks:
            task_id = task["id"]
            depends_on = task.get("depends_on", [])
            graph[task_id] = depends_on
        return graph

    def topological_sort(self) -> List[str]:
        """
        Return tasks in topological order (execution order).
        Raises ValueError if cycle detected.
        """
        graph = self.task_graph
        in_degree = {task_id: 0 for task_id in graph}

        # Calculate in-degrees
        for task_id, deps in graph.items():
            for dep in deps:
                if dep not in in_degree:
                    raise ValueError(f"Unknown dependency: {dep} for task {task_id}")
                in_degree[task_id] += 1

        # Kahn's algorithm
        queue = [tid for tid, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            task_id = queue.pop(0)
            result.append(task_id)

            # Reduce in-degree for dependent tasks
            for other_task, deps in graph.items():
                if task_id in deps:
                    in_degree[other_task] -= 1
                    if in_degree[other_task] == 0:
                        queue.append(other_task)

        if len(result) != len(graph):
            raise ValueError("Cycle detected in task dependencies")

        return result


@dataclass
class PipelineRegistry:
    """
    Registry for pipeline manifests.
    Discovers, loads, validates, and queries pipelines.
    """

    manifest_dirs: List[Path]
    schema_path: Optional[Path] = None
    _pipelines: Dict[str, Pipeline] = field(default_factory=dict)
    _validator: Optional[Draft7Validator] = None

    def __post_init__(self):
        """Initialize registry and load schema."""
        if self.schema_path and self.schema_path.exists():
            with open(self.schema_path) as f:
                schema = json.load(f)
                self._validator = Draft7Validator(schema)

    def discover_manifests(self) -> List[Path]:
        """
        Discover all pipeline manifests in manifest directories.
        Supports .yaml and .json files.
        """
        manifests = []
        for manifest_dir in self.manifest_dirs:
            if not manifest_dir.exists():
                continue

            for ext in ["*.yaml", "*.yml", "*.json"]:
                manifests.extend(manifest_dir.glob(ext))

        return sorted(manifests)

    def load_manifest(self, path: Path) -> Dict[str, Any]:
        """Load a manifest file (YAML or JSON)."""
        with open(path) as f:
            if path.suffix in [".yaml", ".yml"]:
                return yaml.safe_load(f)
            elif path.suffix == ".json":
                return json.load(f)
            else:
                raise ValueError(f"Unsupported manifest format: {path.suffix}")

    def validate_manifest(self, manifest: Dict[str, Any]) -> List[str]:
        """
        Validate manifest against schema.
        Returns list of validation errors (empty if valid).
        """
        if not self._validator:
            return []

        errors = []
        for error in self._validator.iter_errors(manifest):
            errors.append(f"{'.'.join(str(p) for p in error.path)}: {error.message}")

        return errors

    def parse_pipeline(self, manifest: Dict[str, Any], source_file: Optional[Path] = None) -> Pipeline:
        """Parse manifest dict into Pipeline object."""
        metadata = manifest.get("metadata", {})
        spec = manifest.get("spec", {})

        return Pipeline(
            api_version=manifest.get("apiVersion", ""),
            kind=manifest.get("kind", ""),
            name=metadata.get("name", ""),
            description=metadata.get("description", ""),
            owners=metadata.get("owners", []),
            tags=metadata.get("tags", {}),
            annotations=metadata.get("annotations", {}),
            spec=spec,
            source_file=source_file,
        )

    def load_all(self) -> int:
        """
        Load all pipelines from manifest directories.
        Returns number of pipelines loaded.
        """
        self._pipelines.clear()
        manifests = self.discover_manifests()

        for manifest_path in manifests:
            try:
                manifest = self.load_manifest(manifest_path)

                # Validate
                errors = self.validate_manifest(manifest)
                if errors:
                    print(f"⚠️  Validation errors in {manifest_path}:")
                    for error in errors:
                        print(f"   - {error}")
                    continue

                # Parse
                pipeline = self.parse_pipeline(manifest, manifest_path)

                # Register
                if pipeline.name in self._pipelines:
                    print(f"⚠️  Duplicate pipeline name: {pipeline.name}")
                    continue

                self._pipelines[pipeline.name] = pipeline

            except Exception as e:
                print(f"❌ Error loading {manifest_path}: {e}")

        return len(self._pipelines)

    def get(self, name: str) -> Optional[Pipeline]:
        """Get pipeline by name."""
        return self._pipelines.get(name)

    def list_all(self) -> List[Pipeline]:
        """List all registered pipelines."""
        return sorted(self._pipelines.values(), key=lambda p: p.name)

    def filter_by_tags(self, **tags) -> List[Pipeline]:
        """
        Filter pipelines by tags.
        Example: filter_by_tags(domain="security", criticality="high")
        """
        results = []
        for pipeline in self._pipelines.values():
            match = all(
                pipeline.tags.get(key) == value
                for key, value in tags.items()
            )
            if match:
                results.append(pipeline)

        return sorted(results, key=lambda p: p.name)

    def filter_by_owner(self, owner: str) -> List[Pipeline]:
        """Filter pipelines by owner."""
        return [
            p for p in self._pipelines.values()
            if owner in p.owners
        ]

    def filter_by_runtime(self, runtime: str) -> List[Pipeline]:
        """Filter pipelines by execution runtime."""
        return [
            p for p in self._pipelines.values()
            if p.runtime == runtime
        ]

    def get_scheduled_pipelines(self) -> List[Pipeline]:
        """Get all pipelines with schedules enabled."""
        return [
            p for p in self._pipelines.values()
            if p.schedule and p.schedule.get("enabled", True)
        ]

    def analyze_dependencies(self) -> Dict[str, Any]:
        """
        Analyze cross-pipeline dependencies based on input/output datasets.
        Returns dict with dataset producers and consumers.
        """
        producers = {}  # dataset_namespace -> pipeline_name
        consumers = {}  # dataset_namespace -> [pipeline_names]

        for pipeline in self._pipelines.values():
            # Track outputs
            for output in pipeline.outputs:
                namespace = output.get("namespace", "")
                if namespace:
                    producers[namespace] = pipeline.name

            # Track inputs
            for input_ds in pipeline.inputs:
                namespace = input_ds.get("namespace", "")
                if namespace:
                    if namespace not in consumers:
                        consumers[namespace] = []
                    consumers[namespace].append(pipeline.name)

        return {
            "producers": producers,
            "consumers": consumers,
        }

    def find_downstream_pipelines(self, pipeline_name: str) -> Set[str]:
        """
        Find all pipelines that depend on outputs from the given pipeline.
        """
        pipeline = self.get(pipeline_name)
        if not pipeline:
            return set()

        # Get output namespaces
        output_namespaces = {out.get("namespace") for out in pipeline.outputs}

        # Find pipelines that consume these outputs
        downstream = set()
        for other_pipeline in self._pipelines.values():
            if other_pipeline.name == pipeline_name:
                continue

            input_namespaces = {inp.get("namespace") for inp in other_pipeline.inputs}
            if output_namespaces & input_namespaces:
                downstream.add(other_pipeline.name)

        return downstream

    def export_summary(self) -> Dict[str, Any]:
        """Export registry summary as dict."""
        return {
            "total_pipelines": len(self._pipelines),
            "runtimes": {
                runtime: len(self.filter_by_runtime(runtime))
                for runtime in ["airflow", "maestro", "local", "docker"]
            },
            "scheduled": len(self.get_scheduled_pipelines()),
            "tags": self._collect_tags(),
            "owners": self._collect_owners(),
        }

    def _collect_tags(self) -> Dict[str, Set[str]]:
        """Collect all unique tag keys and values."""
        tag_values = {}
        for pipeline in self._pipelines.values():
            for key, value in pipeline.tags.items():
                if key not in tag_values:
                    tag_values[key] = set()
                tag_values[key].add(value)

        return {k: sorted(v) for k, v in tag_values.items()}

    def _collect_owners(self) -> List[str]:
        """Collect all unique owners."""
        owners = set()
        for pipeline in self._pipelines.values():
            owners.update(pipeline.owners)

        return sorted(owners)


def create_registry(
    manifest_dirs: Optional[List[str]] = None,
    schema_path: Optional[str] = None,
) -> PipelineRegistry:
    """
    Create and initialize a pipeline registry.

    Args:
        manifest_dirs: List of directories containing pipeline manifests.
                      Defaults to ./pipelines/manifests
        schema_path: Path to JSON schema for validation.
                    Defaults to ./pipelines/schema/pipeline-manifest.schema.json

    Returns:
        Initialized PipelineRegistry
    """
    # Determine project root
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent

    # Default paths
    if manifest_dirs is None:
        manifest_dirs = [str(project_root / "pipelines" / "manifests")]

    if schema_path is None:
        schema_path = str(project_root / "pipelines" / "schema" / "pipeline-manifest.schema.json")

    # Create registry
    registry = PipelineRegistry(
        manifest_dirs=[Path(d) for d in manifest_dirs],
        schema_path=Path(schema_path) if schema_path else None,
    )

    # Load all manifests
    count = registry.load_all()
    print(f"✅ Loaded {count} pipelines")

    return registry


if __name__ == "__main__":
    # Example usage
    registry = create_registry()

    print("\n📊 Registry Summary:")
    summary = registry.export_summary()
    print(json.dumps(summary, indent=2, default=str))

    print("\n📋 All Pipelines:")
    for pipeline in registry.list_all():
        print(f"  • {pipeline.name} ({pipeline.runtime}) - {pipeline.description[:60]}...")
