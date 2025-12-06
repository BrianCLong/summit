from auto_scientist.graph import ExperimentGraph, Node, NodeType
from auto_scientist.curriculum import Curriculum, CurriculumStage, StageConstraint

def test_curriculum_advancement():
    stages = [
        CurriculumStage(
            "baseline", [], StageConstraint(required_metrics={"accuracy": 0.8})
        ),
        CurriculumStage(
            "advanced", [], StageConstraint(required_metrics={"accuracy": 0.9})
        ),
    ]
    curriculum = Curriculum(stages)
    graph = ExperimentGraph()

    def select_all_evals(g):
        return list(g.nodes_by_type(NodeType.EVAL))

    # Should not advance with no eval nodes
    assert not curriculum.can_advance(graph, select_all_evals)

    # Add an eval node that doesn't meet the metric
    eval1 = Node.new(NodeType.EVAL, {"metrics": {"accuracy": 0.75}}, stage="baseline")
    graph.add_node(eval1)
    assert not curriculum.can_advance(graph, select_all_evals)

    # Add an eval node that meets the metric
    eval2 = Node.new(NodeType.EVAL, {"metrics": {"accuracy": 0.81}}, stage="baseline")
    graph.add_node(eval2)
    assert curriculum.can_advance(graph, select_all_evals)

    # Test advancing
    assert curriculum.current.name == "baseline"
    advanced = curriculum.advance_if_possible(graph, select_all_evals)
    assert advanced
    assert curriculum.current.name == "advanced"

    # Should not be able to advance further yet
    assert not curriculum.can_advance(graph, select_all_evals)

    # Add a new node to meet the second stage requirement
    eval3 = Node.new(NodeType.EVAL, {"metrics": {"accuracy": 0.91}}, stage="advanced")
    graph.add_node(eval3)
    assert curriculum.can_advance(graph, select_all_evals)
