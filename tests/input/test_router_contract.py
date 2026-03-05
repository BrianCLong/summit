import pytest

from summit.input.router import PolicyViolation, route_intents
from summit.input.types import IntentFrame


POLICY = {
    "enabled": True,
    "classes": {
        "command_decode": "allow",
        "identity_inference": "deny",
        "emotion_inference": "deny",
        "physiology_inference": "deny",
    },
    "logging": {"never_log_fields": ["raw_signal", "biometric_features"]},
}


def test_route_allows_command_decode() -> None:
    frames = [
        IntentFrame(
            intent_class="command_decode",
            text="open",
            confidence=0.91,
            meta={"has_consent": False},
        )
    ]
    routed = route_intents(frames, POLICY)
    assert routed == frames


def test_route_blocks_denied_class() -> None:
    frames = [
        IntentFrame(
            intent_class="identity_inference",
            text=None,
            confidence=0.4,
            meta={"has_consent": True},
        )
    ]
    routed = route_intents(frames, POLICY)
    assert routed == []


def test_route_rejects_banned_fields() -> None:
    frames = [
        IntentFrame(
            intent_class="command_decode",
            text="open",
            confidence=0.5,
            meta={"raw_signal": "x"},
        )
    ]
    with pytest.raises(PolicyViolation):
        route_intents(frames, POLICY)
