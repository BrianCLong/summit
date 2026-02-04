import pytest
from summit.governance.events.schema import ExecutionManifest, TraceStep
from summit.governance.replay.replay import ReplayEngine, ReplayMismatchError

def test_replay_success():
    trace = [
        TraceStep(tool_name="tool_a", inputs={"x": 2}, outputs=4),
        TraceStep(tool_name="tool_b", inputs={"y": 3}, outputs=6)
    ]
    manifest = ExecutionManifest(
        agent_id="test-agent",
        agent_version="v1",
        trace=trace,
        tools_allowed=["tool_a", "tool_b"],
        inputs={}
    )

    engine = ReplayEngine(manifest)
    mock_registry = engine.create_mock_registry()

    # Simulate Agent execution using the mock registry
    res_a = mock_registry["tool_a"](x=2)
    assert res_a == 4

    res_b = mock_registry["tool_b"](y=3)
    assert res_b == 6

def test_replay_mismatch_tool():
    trace = [TraceStep(tool_name="tool_a", inputs={}, outputs=None)]
    manifest = ExecutionManifest(
        agent_id="test-agent",
        agent_version="v1",
        trace=trace,
        tools_allowed=["tool_a", "tool_b"],
        inputs={}
    )

    engine = ReplayEngine(manifest)
    mock_registry = engine.create_mock_registry()

    with pytest.raises(ReplayMismatchError, match="Expected tool tool_a, got tool_b"):
        mock_registry["tool_b"]()

def test_replay_mismatch_input():
    trace = [TraceStep(tool_name="tool_a", inputs={"x": 1}, outputs=None)]
    manifest = ExecutionManifest(
        agent_id="test-agent",
        agent_version="v1",
        trace=trace,
        tools_allowed=["tool_a"],
        inputs={}
    )

    engine = ReplayEngine(manifest)
    mock_registry = engine.create_mock_registry()

    with pytest.raises(ReplayMismatchError, match="Input mismatch"):
        mock_registry["tool_a"](x=2)
