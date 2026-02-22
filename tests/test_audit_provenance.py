import pytest

from summit_narrative.audit.log import AuditLog
from summit_narrative.audit.schema import AuditEvent


def test_audit_event_requires_fields():
    with pytest.raises(TypeError):
        AuditEvent(event_id="evt-1")  # type: ignore[call-arg]


def test_hash_chain_verification():
    log = AuditLog(innovation_enabled=True)
    event = AuditEvent(
        event_id="evt-1",
        intervention_id="int-1",
        agent_id="governor",
        agent_version="0.1.0",
        snapshot_hash="hash-1",
        policy_decision="allow",
        policy_refs=["policy.simulate_only.allow"],
        details={"simulate_only": True},
    )
    log.append(event)
    assert log.verify_chain() is True
    assert log.by_intervention_id("int-1")
