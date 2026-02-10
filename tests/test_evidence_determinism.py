import pytest
from summit.evidence.schema import generate_evidence_id

def test_evidence_id_determinism():
    task_spec = {"goal": "fix bug", "file": "main.py"}
    mode = "composer15_like"
    repo_hash = "abc12345"
    budgets = {"deliberation": 100}

    id1 = generate_evidence_id(task_spec, mode, repo_hash, budgets)
    id2 = generate_evidence_id(task_spec, mode, repo_hash, budgets)

    assert id1 == id2
    assert id1.startswith("EVID-C15-")

def test_evidence_id_sensitivity():
    task_spec = {"goal": "fix bug", "file": "main.py"}
    mode = "composer15_like"
    repo_hash = "abc12345"
    budgets = {"deliberation": 100}

    id1 = generate_evidence_id(task_spec, mode, repo_hash, budgets)

    # Change one input
    budgets2 = {"deliberation": 101}
    id2 = generate_evidence_id(task_spec, mode, repo_hash, budgets2)

    assert id1 != id2
