# src/auto_scientist/storage.py
from __future__ import annotations
import json
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Protocol, runtime_checkable

from .schemas import ExperimentGraphModel

class StorageError(Exception):
    """Base exception for storage backend errors."""

@runtime_checkable
class StorageBackend(Protocol):
    """
    Protocol defining the interface for a pluggable storage backend.

    A storage backend is responsible for persisting the experiment graph and
    all associated artifacts.
    """

    def initialize(self) -> None:
        """Initialize the storage backend in the given location."""
        ...

    def load_graph(self) -> ExperimentGraphModel:
        """Load the experiment graph from storage."""
        ...

    def save_graph(self, graph_model: ExperimentGraphModel) -> None:
        """Save the experiment graph to storage."""
        ...

    def save_artifact(self, source_path: Path, node_id: str, artifact_name: str) -> Path:
        """Save an artifact associated with a specific node."""
        ...

    def get_artifact_path(self, node_id: str, artifact_name: str) -> Path:
        """Get the path to a stored artifact."""
        ...

class FileStorageBackend(StorageBackend):
    """
    A simple storage backend that saves the graph to a JSON file and artifacts
    to a local directory structure.

    - project_root/
        - graph.json
        - artifacts/
            - {node_id}/
                - {artifact_name}
    """
    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.graph_path = self.project_path / "graph.json"
        self.artifacts_path = self.project_path / "artifacts"

    def initialize(self) -> None:
        """Create the necessary directories and the initial graph file."""
        try:
            self.project_path.mkdir(parents=True, exist_ok=False)
            self.artifacts_path.mkdir(exist_ok=False)
            self.save_graph(ExperimentGraphModel())
        except FileExistsError:
            raise StorageError(
                f"Project directory '{self.project_path}' already exists. "
                "Use `auto-scientist run` to continue an existing project."
            )
        except Exception as e:
            raise StorageError(f"Failed to initialize project at '{self.project_path}': {e}")

    def load_graph(self) -> ExperimentGraphModel:
        """Load the experiment graph from graph.json."""
        if not self.graph_path.exists():
            raise StorageError(f"Graph file not found at '{self.graph_path}'. Is this a valid project?")
        try:
            with self.graph_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            return ExperimentGraphModel.model_validate(data)
        except Exception as e:
            raise StorageError(f"Failed to load or parse graph from '{self.graph_path}': {e}")

    def save_graph(self, graph_model: ExperimentGraphModel) -> None:
        """Save the experiment graph to graph.json."""
        try:
            with self.graph_path.open("w", encoding="utf-8") as f:
                json.dump(graph_model.model_dump(mode="json"), f, indent=2)
        except Exception as e:
            raise StorageError(f"Failed to save graph to '{self.graph_path}': {e}")

    def save_artifact(self, source_path: Path, node_id: str, artifact_name: str) -> Path:
        """Copy the artifact into the artifacts directory for the given node."""
        try:
            target_dir = self.artifacts_path / str(node_id)
            target_dir.mkdir(parents=True, exist_ok=True)
            target_path = target_dir / artifact_name
            shutil.copy(source_path, target_path)
            return target_path
        except Exception as e:
            raise StorageError(f"Failed to save artifact '{source_path}' for node '{node_id}': {e}")

    def get_artifact_path(self, node_id: str, artifact_name: str) -> Path:
        """Retrieve the path to a stored artifact."""
        path = self.artifacts_path / str(node_id) / artifact_name
        if not path.exists():
            raise StorageError(f"Artifact '{artifact_name}' not found for node '{node_id}'")
        return path
