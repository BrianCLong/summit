import pytest
from summit.agents.context import ContextManager
from summit.agents.summarize import Summary

def test_context_exhaustion():
    # Set small limit for testing
    cm = ContextManager(max_tokens=10)
    cm.add_chunk("A" * 100) # 100 chars / 4 = 25 tokens > 10
    assert cm.is_exhausted()

def test_summarization_recursion():
    cm = ContextManager(max_tokens=10, recursion_limit=2)
    cm.add_chunk("A" * 100)

    state = {"files_touched": ["a.py"]}

    # 1st recursion
    summary = cm.summarize_and_recurse(state)
    assert isinstance(summary, Summary)
    assert cm.recursion_depth == 1
    assert len(cm.context_chunks) == 1
    assert "facts" in cm.context_chunks[0]

    # 2nd recursion
    cm.add_chunk("B" * 100)
    cm.summarize_and_recurse(state)
    assert cm.recursion_depth == 2

    # 3rd recursion -> Fail
    cm.add_chunk("C" * 100)
    with pytest.raises(RecursionError):
        cm.summarize_and_recurse(state)
