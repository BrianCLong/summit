import pytest
from summit.agents.context import ContextManager

def test_robustness_short_context():
    # Short context limit shouldn't crash, just recurse
    cm = ContextManager(max_tokens=10)
    cm.add_chunk("A" * 100)
    assert cm.is_exhausted()
    summary = cm.summarize_and_recurse({})
    assert summary is not None

def test_robustness_long_context():
    # Long context limit should handle larger chunks without exhaustion
    cm = ContextManager(max_tokens=1000)
    cm.add_chunk("A" * 100)
    assert not cm.is_exhausted()
