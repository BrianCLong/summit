import json
from pathlib import Path

from agents.ledger.ledger import ExecutionLedger
from agents.ledger.storage import write_ledger


def test_ledger_persists_to_disk(tmp_path: Path) -> None:
    ledger = ExecutionLedger(run_id="run-1")
    ledger.add_todo("Implement plan gate", "EV-run-1-plan-001")
    ledger.add_decision("Keep default off", "EV-run-1-policy-002")

    out = tmp_path / "execution_ledger.json"
    write_ledger(out, ledger.to_dict())

    payload = json.loads(out.read_text(encoding="utf-8"))
    assert payload["run_id"] == "run-1"
    assert payload["todos"][0]["evidence_id"] == "EV-run-1-plan-001"
