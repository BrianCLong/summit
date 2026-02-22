import pytest
from control_plane.observability.hooks import ObservabilityHook
from maestro.runtime.replay.replayer import AgentReplayer

def test_observability_redaction():
    hook = ObservabilityHook(session_id="sess-obs")
    data = {"api_key": "sk-123456789012345678901234"}
    event = hook.record_event("login", data)
    assert event["data"]["api_key"] == "[REDACTED]"

def test_incident_replay():
    replayer = AgentReplayer()
    trace = [{"session_id": "sess-1", "event_type": "llm_interaction", "data": {"response": "Hi", "step": 1}}]
    reconstructed = replayer.reconstruct_state(trace)
    assert reconstructed.session_id == "sess-1"
