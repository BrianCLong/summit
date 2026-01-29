import pytest
from summit.workflows.ir import WorkflowIR, Step
from summit.builder.graph import to_mermaid

def test_to_mermaid_output():
    ir = WorkflowIR(
        steps=[
            Step(id="s1", kind="classify"),
            Step(id="s2", kind="extract"),
        ],
        edges=[("s1", "s2")]
    )
    m = to_mermaid(ir)
    assert "flowchart TD" in m
    assert 's1["classify:s1"]' in m
    assert 's2["extract:s2"]' in m
    assert "s1 --> s2" in m
