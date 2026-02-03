import os
from unittest import mock

from summit_misinfo.ead import EADState, ead_detector
from summit_misinfo.signals import StreamEvent


def test_ead_burst():
    state = EADState()
    d = ead_detector(state)

    # 50 events in 1 minute
    events = []
    for i in range(50):
        e = StreamEvent("post", "x", f"u{i}", "c1", None, 1000 + i*100)
        score = d(e)
        events.append(score)

    # The last one triggers the burst
    assert events[-1].risk_score >= 0.5
    assert "burst>=50/5m" in events[-1].reasons

def test_ead_organic():
    state = EADState()
    d = ead_detector(state)

    # 10 events
    score = None
    for i in range(10):
        e = StreamEvent("post", "x", f"u{i}", "c1", None, 1000 + i*100)
        score = d(e)

    assert score.risk_score == 0.0

def test_ead_signals():
    state = EADState()
    d = ead_detector(state)

    e = StreamEvent(
        "mention", "x", "u1", "c1", None, 1000,
        mentioned_actor_id="target",
        actor_age_days=1,
        actor_is_verified=False
    )
    score = d(e)

    # 0.2 (mention) + 0.2 (new account) + 0.1 (unverified) = 0.5
    assert abs(score.risk_score - 0.5) < 1e-9
    assert "mention-targeting" in score.reasons
    assert "new-account" in score.reasons
    assert "unverified-actor" in score.reasons

def test_ead_sandbox_mode():
    with mock.patch.dict(os.environ, {"SANDBOX_MODE": "1"}):
        state = EADState()
        d = ead_detector(state)
        # 50 events, should pass under relaxed threshold (100)
        score = None
        for i in range(50):
            e = StreamEvent("post", "x", f"u{i}", "c1", None, 1000 + i*100)
            score = d(e)
        # 0.0 or 0.1 depending on verified
        # e.actor_is_verified is None (default), so 0.0
        assert score.risk_score == 0.0

        # 50 more events to reach 100
        for i in range(50, 100):
            e = StreamEvent("post", "x", f"u{i}", "c1", None, 1000 + i*100)
            score = d(e)

        assert score.risk_score >= 0.5
        assert "burst>=100/5m" in score.reasons
