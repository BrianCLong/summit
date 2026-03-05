import pytest

from summit.cbm.coordination import SignalLedger, detect_coordination
from summit.cbm.schema import DocumentEvent


def test_coordination_determinism():
    events = [
        DocumentEvent(id="1", content="Normal content", source="site1", metadata={"author_id": "botA"}),
        DocumentEvent(id="2", content="Burst content", source="site2", metadata={"author_id": "botA"}),
        DocumentEvent(id="3", content="Burst content", source="site2", metadata={"author_id": "botB"})
    ]

    ledger1 = SignalLedger()
    res1 = detect_coordination(events, ledger1, "20240101")

    ledger2 = SignalLedger()
    res2 = detect_coordination(events, ledger2, "20240101")

    assert res1 == res2
    assert len(res1["nodes"]) == 4 # botA, botB, site1, site2
    assert len(res1["signals"]) == 2 # 2 burst signals recorded
    assert "EVID-CBM-20240101" in res1["metadata"]["evidence_id"]
