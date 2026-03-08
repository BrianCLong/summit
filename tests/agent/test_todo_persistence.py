from pathlib import Path

from agents.todos.storage import load_ledger, save_ledger


def test_todo_persistence_across_load_save_cycles(tmp_path: Path) -> None:
    path = tmp_path / 'artifacts' / 'todos.json'
    ledger = load_ledger(path)

    created = ledger.add('collect data')
    ledger.set_status(created.id, 'done')
    ledger.add('run analysis')
    save_ledger(path, ledger)

    reloaded = load_ledger(path)

    assert len(reloaded.todos) == 2
    assert reloaded.todos[0].status == 'done'
    assert reloaded.todos[1].status == 'pending'
