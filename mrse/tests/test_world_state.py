from mrse.world_state import WorldState


def test_world_state_clone_independent_mutations():
    state = WorldState.from_sources({"files": 10}, intents=["intent-1"], tasks=["task-1"])
    clone = state.clone()

    clone.register_task("task-2")
    clone.register_diff({"path": "file.py", "change": "edit"})

    assert len(state.tasks) == 1
    assert len(clone.tasks) == 2
    assert len(state.diffs) == 0
    assert len(clone.diffs) == 1
