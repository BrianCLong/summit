import pytest
import os
import json
from core.orchestrator.graph import OrchestratorGraph
from core.orchestrator.engine import OrchestratorEngine
from core.orchestrator.schema import OrchestrationSchema, AgentRole

def test_dag_acyclic():
    graph = OrchestratorGraph()
    graph.add_agent("A")
    graph.add_agent("B")
    graph.add_edge("A", "B")
    assert graph.is_acyclic() is True

def test_dag_cyclic():
    graph = OrchestratorGraph()
    graph.add_agent("A")
    graph.add_agent("B")
    graph.add_edge("A", "B")
    graph.add_edge("B", "A")
    assert graph.is_acyclic() is False

def test_execution_order():
    graph = OrchestratorGraph()
    graph.add_agent("A")
    graph.add_agent("B")
    graph.add_agent("C")
    graph.add_edge("A", "B")
    graph.add_edge("B", "C")
    order = graph.get_execution_order()
    assert order == ["A", "B", "C"]

def test_engine_execution_and_artifacts():
    schema = OrchestrationSchema(roles=[AgentRole(name="researcher")])
    engine = OrchestratorEngine(schema=schema)
    graph = OrchestratorGraph()
    graph.add_agent("researcher")
    graph.add_agent("critic")
    graph.add_edge("researcher", "critic")

    results = engine.execute(graph, evidence_id_seq=42)
    assert "researcher" in results
    assert "critic" in results

    # Check artifacts
    assert os.path.exists("artifacts/report.json")
    assert os.path.exists("artifacts/metrics.json")
    assert os.path.exists("artifacts/stamp.json")

    with open("artifacts/stamp.json", "r") as f:
        stamp = json.load(f)
        assert stamp["evidence_id"] == "SUMMIT-ORCH-0042"
        assert "timestamp" not in stamp

def test_engine_cyclic_fail():
    engine = OrchestratorEngine()
    graph = OrchestratorGraph()
    graph.add_agent("A")
    graph.add_agent("B")
    graph.add_edge("A", "B")
    graph.add_edge("B", "A")

    with pytest.raises(ValueError, match="Execution graph contains cycles"):
        engine.execute(graph)
