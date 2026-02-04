import pytest
import contextvars
from summit.governance.storage.aeg_store import AEGStore
from summit.governance.instrumentation.middleware import GovernanceMiddleware, dae_context
from summit.governance.dae.envelope import DeterministicActionEnvelope
from summit.governance.dae.bounds import ExecutionBounds

def test_event_flow(tmp_path):
    ledger_path = tmp_path / "ledger.jsonl"
    store = AEGStore(str(ledger_path))
    middleware = GovernanceMiddleware(store)

    def my_tool(a, b):
        return a + b

    wrapped_tool = middleware.wrap_tool("adder", my_tool)

    result = wrapped_tool(a=1, b=2)
    assert result == 3

    events = store.ledger_store.read_all()
    assert len(events) == 2
    assert events[0].event_type == "ToolProposed"
    assert events[1].event_type == "ToolExecuted"
    assert events[0].trace_id == events[1].trace_id
    assert events[0].metadata["tool"] == "adder"

def test_event_flow_with_dae(tmp_path):
    ledger_path = tmp_path / "ledger_dae.jsonl"
    store = AEGStore(str(ledger_path))
    middleware = GovernanceMiddleware(store)

    bounds = ExecutionBounds(allowed_tools=["adder"])
    dae = DeterministicActionEnvelope(bounds, "test_ctx")

    def my_tool(a, b):
        return a + b

    wrapped_tool = middleware.wrap_tool("adder", my_tool)

    # Inject DAE
    token = dae_context.set(dae)
    try:
        result = wrapped_tool(a=1, b=2)
        assert result == 3

        # Check counters
        assert dae.counters.tool_calls_count == 1
    finally:
        dae_context.reset(token)

    events = store.ledger_store.read_all()
    assert len(events) == 2
