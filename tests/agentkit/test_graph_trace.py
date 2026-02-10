import pytest
from summit.agentkit.graph import SummitGraph, RunContext
from summit.agentkit.trace import to_mermaid

def test_graph_execution():
    def node_a(state, ctx):
        state["a"] = 1
        return state

    def node_b(state, ctx):
        state["b"] = 2
        return state

    g = SummitGraph()
    g.add_node("A", node_a)
    g.add_node("B", node_b)
    g.add_edge("A", "B")
    g.set_entry("A")

    ctx = RunContext(run_id="test-run", flags={"SUMMIT_AGENTKIT_ENABLED": True})
    state, trace = g.run({}, ctx)

    assert state == {"a": 1, "b": 2}
    assert len(trace) == 2
    assert trace[0]["node"] == "A"
    assert trace[1]["node"] == "B"

    mermaid = to_mermaid(trace)
    assert "Participant A" in mermaid
    assert "Participant B" in mermaid

def test_graph_max_steps():
    def node_loop(state, ctx):
        return state

    g = SummitGraph()
    g.add_node("loop", node_loop)
    g.add_edge("loop", "loop")
    g.set_entry("loop")

    ctx = RunContext(run_id="test-loop", flags={"SUMMIT_AGENTKIT_ENABLED": True})

    with pytest.raises(RuntimeError, match="max_steps exceeded"):
        g.run({}, ctx, max_steps=5)

def test_graph_disabled():
    g = SummitGraph()
    ctx = RunContext(run_id="test-disabled", flags={"SUMMIT_AGENTKIT_ENABLED": False})
    with pytest.raises(RuntimeError, match="agentkit disabled"):
        g.run({}, ctx)
