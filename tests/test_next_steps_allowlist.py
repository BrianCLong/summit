import pytest

from modules.decision.next_steps import ALLOWED_NEXT_STEPS, recommend_next_steps


def test_only_allowed_steps_returned():
    drivers = ["toxicity", "automation", "unknown_bad_thing"]
    steps = recommend_next_steps(drivers, {})
    for step in steps:
        assert step in ALLOWED_NEXT_STEPS

def test_determinism():
    drivers = ["toxicity"]
    assert recommend_next_steps(drivers, {}) == ["monitor", "escalate_to_comms"]
