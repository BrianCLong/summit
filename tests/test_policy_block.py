import pytest
from core.orchestrator.graph import OrchestratorGraph
from core.orchestrator.policy_gate import PolicyGate

def test_policy_allow():
    graph = OrchestratorGraph()
    graph.add_agent("researcher")
    graph.add_agent("critic")
    graph.add_edge("researcher", "critic")

    policy = PolicyGate(allowed_edges=[{"from": "researcher", "to": "critic"}])
    # Should not raise
    policy.validate_graph(graph)

def test_policy_violation():
    graph = OrchestratorGraph()
    graph.add_agent("researcher")
    graph.add_agent("malicious_agent")
    graph.add_edge("researcher", "malicious_agent")

    policy = PolicyGate(allowed_edges=[{"from": "researcher", "to": "critic"}])

    with pytest.raises(PermissionError, match="Policy Violation: Unapproved data flow from researcher to malicious_agent"):
        policy.validate_graph(graph)

def test_deny_by_default():
    graph = OrchestratorGraph()
    graph.add_agent("A")
    graph.add_agent("B")
    graph.add_edge("A", "B")

    policy = PolicyGate(allowed_edges=[]) # Empty allowlist

    with pytest.raises(PermissionError):
        policy.validate_graph(graph)
