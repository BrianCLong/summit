import json
from pathlib import Path

from agents.ledger.ledger import ExecutionLedger, LedgerEntry
from agents.ledger.storage import LedgerStorage


def test_execution_ledger_persists_sorted_tasks(tmp_path: Path) -> None:
    ledger_path = tmp_path / "execution_ledger.json"
    ledger = ExecutionLedger(LedgerStorage(ledger_path))
    ledger.append(LedgerEntry(task_id="T-2", state="done", evidence_refs=["EV-R204-PLAN-001"]))
    ledger.append(LedgerEntry(task_id="T-1", state="todo", evidence_refs=[]))

    digest = ledger.persist()
    payload = json.loads(ledger_path.read_text(encoding="utf-8"))

    assert len(digest) == 64
    assert payload["tasks"][0]["task_id"] == "T-1"
