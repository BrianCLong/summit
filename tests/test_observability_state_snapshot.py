import pytest
from summit.observability.state import StateSnapshot
from summit.observability.redaction import Redactor

def test_state_snapshot_redaction():
    state = StateSnapshot(
        agent_id="test",
        step="think",
        inputs={"query": "secret plan", "api_key": "12345"},
        internal_state={"memory": "safe", "password": "pass"}
    )

    redactor = Redactor(denylist={"api_key", "password"})
    d = state.to_dict(redactor)

    assert d["inputs"]["api_key"] == "[REDACTED]"
    assert d["inputs"]["query"] == "secret plan"
    assert d["internal_state"]["password"] == "[REDACTED]"
    assert d["internal_state"]["memory"] == "safe"

def test_state_snapshot_allowlist():
    state = StateSnapshot(
        agent_id="test",
        step="think",
        inputs={"safe": "yes", "unsafe": "no"},
        internal_state={}
    )

    redactor = Redactor(allowlist={"safe"})
    d = state.to_dict(redactor)

    assert d["inputs"]["safe"] == "yes"
    assert d["inputs"]["unsafe"] == "[REDACTED]"
