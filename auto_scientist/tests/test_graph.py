# tests/test_graph.py
import pytest
from unittest.mock import MagicMock, call

from auto_scientist.graph import ExperimentGraph
from auto_scientist.storage import StorageBackend
from auto_scientist.schemas import ExperimentGraphModel, Node, Edge, NodeType, EdgeType, UUID
from uuid import uuid4

@pytest.fixture
def mock_storage() -> MagicMock:
    """Fixture to create a mock storage backend with an empty graph."""
    storage = MagicMock(spec=StorageBackend)
    storage.load_graph.return_value = ExperimentGraphModel()
    return storage

def test_graph_initialization(mock_storage: MagicMock):
    """Test that the graph loads from storage on initialization."""
    ExperimentGraph(storage=mock_storage)
    mock_storage.load_graph.assert_called_once()

def test_add_node(mock_storage: MagicMock):
    """Test adding a node and committing the change."""
    graph = ExperimentGraph(storage=mock_storage)
    node = Node(type=NodeType.HYPOTHESIS)

    graph.add_node(node)

    assert node.id in graph.nodes
    mock_storage.save_graph.assert_called_once()
    # Check that the model passed to save_graph contains the new node
    saved_model = mock_storage.save_graph.call_args[0][0]
    assert node.id in saved_model.nodes

def test_add_node_duplicate(mock_storage: MagicMock):
    """Test that adding a node with a duplicate ID raises an error."""
    graph = ExperimentGraph(storage=mock_storage)
    node = Node(type=NodeType.HYPOTHESIS)
    graph.add_node(node)

    with pytest.raises(ValueError):
        graph.add_node(node)

def test_add_edge(mock_storage: MagicMock):
    """Test adding an edge and committing the change."""
    graph = ExperimentGraph(storage=mock_storage)
    node1 = Node(type=NodeType.DATASET)
    node2 = Node(type=NodeType.MODEL)
    graph.add_node(node1)
    graph.add_node(node2)

    # Reset mock after setup
    mock_storage.save_graph.reset_mock()

    graph.add_edge(node1.id, node2.id, EdgeType.DEPENDS_ON)

    assert len(graph.edges) == 1
    edge = graph.edges[0]
    assert edge.source == node1.id
    assert edge.target == node2.id

    mock_storage.save_graph.assert_called_once()
    saved_model = mock_storage.save_graph.call_args[0][0]
    assert edge in saved_model.edges

def test_get_node(mock_storage: MagicMock):
    """Test retrieving a node by its ID."""
    graph = ExperimentGraph(storage=mock_storage)
    node = Node(type=NodeType.EVAL)
    graph.add_node(node)

    retrieved_node = graph.get_node(node.id)
    assert retrieved_node == node

def test_get_node_not_found(mock_storage: MagicMock):
    """Test that getting a non-existent node raises a KeyError."""
    graph = ExperimentGraph(storage=mock_storage)
    with pytest.raises(KeyError):
        graph.get_node(uuid4())

def test_successors_and_predecessors(mock_storage: MagicMock):
    """Test successor and predecessor queries."""
    graph = ExperimentGraph(storage=mock_storage)
    h = Node(type=NodeType.HYPOTHESIS)
    d = Node(type=NodeType.DATASET)
    r = Node(type=NodeType.TRAIN_RUN)
    graph.add_node(h)
    graph.add_node(d)
    graph.add_node(r)
    graph.add_edge(h.id, r.id, EdgeType.DEPENDS_ON)
    graph.add_edge(d.id, r.id, EdgeType.DEPENDS_ON)

    successors = list(graph.successors(h.id))
    assert successors == [r]

    predecessors = list(graph.predecessors(r.id))
    assert h in predecessors
    assert d in predecessors
    assert len(predecessors) == 2

def test_nodes_by_type(mock_storage: MagicMock):
    """Test filtering nodes by their type."""
    graph = ExperimentGraph(storage=mock_storage)
    h1 = Node(type=NodeType.HYPOTHESIS)
    h2 = Node(type=NodeType.HYPOTHESIS)
    d1 = Node(type=NodeType.DATASET)
    graph.add_node(h1)
    graph.add_node(h2)
    graph.add_node(d1)

    hypotheses = list(graph.nodes_by_type(NodeType.HYPOTHESIS))
    assert h1 in hypotheses
    assert h2 in hypotheses
    assert len(hypotheses) == 2

    datasets = list(graph.nodes_by_type(NodeType.DATASET))
    assert datasets == [d1]
