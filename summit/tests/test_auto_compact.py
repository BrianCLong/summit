from summit.agentloop.compaction_adapter import CompactedState, CompactionAdapter
from summit.context.compaction import CompactionManager


def test_compaction_limit():
    manager = CompactionManager(limit=100)
    assert manager.should_compact(50) is False
    assert manager.should_compact(150) is True

def test_compaction_adapter():
    adapter = CompactionAdapter()
    items = [{"role": "user", "content": "hello"}, {"role": "assistant", "content": "hi"}]

    state = adapter.compact_items(items)
    assert isinstance(state, CompactedState)
    assert state.encrypted_content == "opaque_blob_simulated"
    assert "Compacted 2 items" in state.summary

    restored = adapter.restore_from_compact(state)
    assert len(restored) == 2
    assert "Previous conversation summary" in restored[0]["content"]
