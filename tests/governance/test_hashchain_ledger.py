import pytest
import os
from summit.governance.events.schema import AuditEvent
from summit.governance.ledger.hashchain import HashChainLedger
from summit.governance.ledger.store import LedgerStore

def test_ledger_append_and_verify():
    ledger = HashChainLedger()

    event1 = AuditEvent(trace_id="t1", event_type="test", actor="user1")
    hash1 = ledger.append(event1)

    event2 = AuditEvent(trace_id="t2", event_type="test", actor="user1")
    hash2 = ledger.append(event2)

    assert event1.previous_hash == "0" * 64
    assert event2.previous_hash == hash1

    assert ledger.verify_chain([event1, event2])

def test_ledger_tamper_detection():
    ledger = HashChainLedger()
    event1 = AuditEvent(trace_id="t1", event_type="test", actor="user1")
    ledger.append(event1)

    event2 = AuditEvent(trace_id="t2", event_type="test", actor="user1")
    ledger.append(event2)

    # Tamper with event1
    event1.actor = "malicious_user"

    # Verification should fail because hash(event1) will no longer match event2.previous_hash
    # Note: In a real system, changing event1's content changes its hash.
    # verify_chain computes hash(event1) and checks against event2.previous_hash.
    assert not ledger.verify_chain([event1, event2])

def test_ledger_store(tmp_path):
    ledger_file = tmp_path / "ledger.jsonl"
    store = LedgerStore(str(ledger_file))

    event1 = AuditEvent(trace_id="t1", event_type="test", actor="user1")
    store.append(event1)

    event2 = AuditEvent(trace_id="t2", event_type="test", actor="user1")
    store.append(event2)

    assert store.verify()

    # Reload from disk
    store2 = LedgerStore(str(ledger_file))
    assert store2.verify()
    events = store2.read_all()
    assert len(events) == 2
    # Verify linking
    assert events[1].previous_hash == store.ledger._compute_hash(events[0])
