from graphrag.store.repl_log import ReplLog, ReplEvent
from graphrag.store.reconcile import Reconciler

def test_reconcile_deterministic():
    log1 = ReplLog()
    log1.append(ReplEvent("1", "us", {"key": "value1"}))
    log1.append(ReplEvent("2", "us", {"key": "value2"}))

    log2 = ReplLog()
    log2.append(ReplEvent("1", "us", {"key": "value1"}))
    log2.append(ReplEvent("2", "us", {"key": "value2"}))

    rec = Reconciler()
    state1 = rec.reconcile(log1)
    state2 = rec.reconcile(log2)

    assert state1 == state2
    assert state1["key"] == "value2"
