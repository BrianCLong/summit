import json


def save_ledger(ledger, filepath: str):
    data = {
        "todos": ledger.todos,
        "decisions": ledger.decisions,
        "evidence": ledger.evidence
    }
    with open(filepath, 'w') as f:
        json.dump(data, f)

def load_ledger(filepath: str):
    with open(filepath) as f:
        data = json.load(f)
    # Instantiate and populate
    from .ledger import Ledger
    ledger = Ledger()
    ledger.todos = data.get("todos", [])
    ledger.decisions = data.get("decisions", [])
    ledger.evidence = data.get("evidence", [])
    return ledger
