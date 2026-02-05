import pytest
from summit.mars.pipeline import MARSPipeline

def test_mars_pipeline_shapes():
    evidence_id = "EVID-PIPE0001"
    pipeline = MARSPipeline(evidence_id)
    pipeline.construct("Automate AI Research")

    plan = pipeline.get_plan_artifact()
    assert plan["evidence_id"] == evidence_id
    assert len(plan["tasks"]) == 3

    tasks = plan["tasks"]
    # Check types and order (sorted by task_id)
    assert tasks[0]["type"] == "design"
    assert tasks[1]["type"] == "decompose"
    assert tasks[2]["type"] == "implement"

    # Check dependencies
    assert "task_0_design" in tasks[1]["dependencies"]
    assert "task_1_decompose" in tasks[2]["dependencies"]

def test_task_graph_cycle_detection():
    from summit.mars.task_graph import TaskGraph
    tg = TaskGraph()
    tg.add_task("A", "design")
    tg.add_task("B", "decompose")
    tg.add_dependency("B", "A")
    assert tg.validate() is True

    tg.add_dependency("A", "B") # Cycle
    assert tg.validate() is False
