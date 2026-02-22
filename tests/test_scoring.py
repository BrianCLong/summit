import os
from unittest import mock

from summit_misinfo.scoring import Registry, Score
from summit_misinfo.signals import StreamEvent


def test_registry_score():
    r = Registry()
    r.register(lambda e: Score(0.5, ["reason"], ["evd"]))

    event = StreamEvent("post", "x", "u1", "c1", None, 1000)
    scores = r.score(event)
    assert len(scores) == 1
    assert scores[0].risk_score == 0.5

def test_registry_kill_switch():
    with mock.patch.dict(os.environ, {"MISINFO_DEFENSE_ENABLED": "0"}):
        r = Registry()
        r.register(lambda e: Score(0.5, ["reason"], ["evd"]))
        event = StreamEvent("post", "x", "u1", "c1", None, 1000)
        assert len(r.score(event)) == 0
