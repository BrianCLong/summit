from integrity.signals.base import Event
from integrity.signals.timing import burst_counts


def test_burst_counts_deterministic():
    ev = [
        Event(ts_ms=0, actor_id="a", action="post", target_id=None, community_id="c1"),
        Event(ts_ms=59000, actor_id="b", action="post", target_id=None, community_id="c1"),
        Event(ts_ms=61000, actor_id="c", action="post", target_id=None, community_id="c1"),
    ]
    assert burst_counts(ev) == {0: 2, 1: 1}
