# tests/test_storage.py
import pytest
from pathlib import Path
import json

from auto_scientist.storage import FileStorageBackend, StorageError
from auto_scientist.schemas import ExperimentGraphModel, Node, NodeType

def test_initialize_success(tmp_path: Path):
    """Test successful initialization of a new project."""
    project_path = tmp_path / "test_project"
    storage = FileStorageBackend(project_path)
    storage.initialize()

    assert project_path.is_dir()
    assert (project_path / "artifacts").is_dir()
    assert (project_path / "graph.json").is_file()

    # Verify the initial graph is empty
    graph_model = storage.load_graph()
    assert isinstance(graph_model, ExperimentGraphModel)
    assert not graph_model.nodes
    assert not graph_model.edges

def test_initialize_already_exists(tmp_path: Path):
    """Test that initialization fails if the directory already exists."""
    project_path = tmp_path / "test_project"
    project_path.mkdir()
    storage = FileStorageBackend(project_path)

    with pytest.raises(StorageError, match="already exists"):
        storage.initialize()

def test_save_and_load_graph(tmp_path: Path):
    """Test that a graph can be saved and loaded correctly."""
    project_path = tmp_path / "test_project"
    storage = FileStorageBackend(project_path)
    storage.initialize()

    # Create a graph with some data
    node = Node(type=NodeType.HYPOTHESIS, payload={"text": "A test hypothesis"})
    graph_model = ExperimentGraphModel(nodes={node.id: node})

    # Save and reload
    storage.save_graph(graph_model)
    loaded_model = storage.load_graph()

    assert loaded_model.nodes[node.id].payload["text"] == "A test hypothesis"
    assert len(loaded_model.nodes) == 1

def test_load_graph_not_found(tmp_path: Path):
    """Test that loading fails if graph.json doesn't exist."""
    storage = FileStorageBackend(tmp_path)
    with pytest.raises(StorageError, match="not found"):
        storage.load_graph()

def test_load_graph_invalid_json(tmp_path: Path):
    """Test that loading fails on malformed JSON."""
    project_path = tmp_path / "test_project"
    project_path.mkdir()
    graph_file = project_path / "graph.json"
    graph_file.write_text("{invalid json}")

    storage = FileStorageBackend(project_path)
    with pytest.raises(StorageError, match="Failed to load or parse graph"):
        storage.load_graph()

def test_save_and_get_artifact(tmp_path: Path):
    """Test saving and retrieving an artifact."""
    project_path = tmp_path / "test_project"
    storage = FileStorageBackend(project_path)
    storage.initialize()

    # Create a dummy artifact file
    artifact_content = "This is a test artifact."
    source_artifact = tmp_path / "my_model.pkl"
    source_artifact.write_text(artifact_content)

    node = Node(type=NodeType.EVAL)
    artifact_name = "model.pkl"

    # Save and verify path
    stored_path = storage.save_artifact(source_artifact, str(node.id), artifact_name)
    assert stored_path.exists()
    assert stored_path.name == artifact_name
    assert str(node.id) in str(stored_path)
    assert stored_path.read_text() == artifact_content

    # Retrieve and verify path
    retrieved_path = storage.get_artifact_path(str(node.id), artifact_name)
    assert retrieved_path == stored_path

def test_get_artifact_not_found(tmp_path: Path):
    """Test that getting a non-existent artifact raises an error."""
    project_path = tmp_path / "test_project"
    storage = FileStorageBackend(project_path)
    storage.initialize()

    with pytest.raises(StorageError, match="not found"):
        storage.get_artifact_path("some-node-id", "non-existent-artifact.zip")
