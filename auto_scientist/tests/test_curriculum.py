# tests/test_curriculum.py
import pytest
from pathlib import Path

from auto_scientist.curriculum import Curriculum, CurriculumError, CurriculumStage, StageConstraint
from auto_scientist.graph import ExperimentGraph
from auto_scientist.schemas import Node, NodeType
from unittest.mock import MagicMock

@pytest.fixture
def curriculum_yaml(tmp_path: Path) -> Path:
    """Fixture to create a sample curriculum.yaml file."""
    content = """
    stages:
      - name: "baseline"
        description: "..."
        goals: ["..."]
        constraints:
          required_metrics:
            accuracy: 0.8
      - name: "improvement"
        description: "..."
        goals: ["..."]
        constraints:
          required_metrics:
            accuracy: 0.9
          max_runs: 2
    """
    path = tmp_path / "curriculum.yaml"
    path.write_text(content)
    return path

@pytest.fixture
def mock_graph() -> MagicMock:
    """Fixture to create a mock ExperimentGraph."""
    return MagicMock(spec=ExperimentGraph)

def test_load_from_yaml(curriculum_yaml: Path):
    """Test successful loading of a curriculum from a YAML file."""
    curriculum = Curriculum.from_yaml(curriculum_yaml)
    assert len(curriculum.stages) == 2
    assert curriculum.current.name == "baseline"
    assert curriculum.stages[0].constraints.required_metrics["accuracy"] == 0.8

def test_load_yaml_not_found():
    """Test that loading a non-existent file raises an error."""
    with pytest.raises(CurriculumError, match="Failed to load"):
        Curriculum.from_yaml(Path("non-existent-file.yaml"))

def test_can_advance_metric_met(mock_graph: MagicMock):
    """Test can_advance when the required metric is met."""
    stage = CurriculumStage(
        name="baseline",
        description="",
        goals=[],
        constraints=StageConstraint(required_metrics={"accuracy": 0.8})
    )
    curriculum = Curriculum(stages=[stage])

    eval_node = Node(type=NodeType.EVAL, stage="baseline", payload={"metrics": {"accuracy": 0.81}})
    mock_graph.nodes_by_type.return_value = [eval_node]

    assert curriculum.can_advance(mock_graph)

def test_can_advance_metric_not_met(mock_graph: MagicMock):
    """Test can_advance when the required metric is not met."""
    stage = CurriculumStage(
        name="baseline",
        description="",
        goals=[],
        constraints=StageConstraint(required_metrics={"accuracy": 0.8})
    )
    curriculum = Curriculum(stages=[stage])

    eval_node = Node(type=NodeType.EVAL, stage="baseline", payload={"metrics": {"accuracy": 0.75}})
    mock_graph.nodes_by_type.return_value = [eval_node]

    assert not curriculum.can_advance(mock_graph)

def test_can_advance_max_runs_hit(mock_graph: MagicMock):
    """Test can_advance when max_runs is hit, even if metrics are not."""
    stage = CurriculumStage(
        name="improvement",
        description="",
        goals=[],
        constraints=StageConstraint(required_metrics={"accuracy": 0.9}, max_runs=2)
    )
    curriculum = Curriculum(stages=[stage])

    eval_node1 = Node(type=NodeType.EVAL, stage="improvement", payload={"metrics": {"accuracy": 0.8}})
    eval_node2 = Node(type=NodeType.EVAL, stage="improvement", payload={"metrics": {"accuracy": 0.85}})
    mock_graph.nodes_by_type.return_value = [eval_node1, eval_node2]

    assert curriculum.can_advance(mock_graph)

def test_advance(curriculum_yaml: Path):
    """Test the advance method."""
    curriculum = Curriculum.from_yaml(curriculum_yaml)
    assert curriculum.current.name == "baseline"

    advanced = curriculum.advance()
    assert advanced
    assert curriculum.current.name == "improvement"

    # Already at the last stage
    not_advanced = curriculum.advance()
    assert not not_advanced
    assert curriculum.current.name == "improvement"

def test_is_complete():
    """Test the is_complete property."""
    stage1 = CurriculumStage(name="s1", description="", goals=[], constraints=StageConstraint())
    stage2 = CurriculumStage(name="s2", description="", goals=[], constraints=StageConstraint())
    curriculum = Curriculum(stages=[stage1, stage2])

    assert not curriculum.is_complete

    curriculum.advance()
    assert curriculum.is_complete
