from typing import Dict, Iterable, List

from summit.input.types import IntentFrame
from summit.policy.biometric_gate import GateDecision, evaluate


class PolicyViolation(ValueError):
    pass


def _ensure_no_banned_fields(frame: IntentFrame, policy: dict) -> None:
    banned = policy.get("logging", {}).get("never_log_fields", [])
    banned_keys = set(banned)
    present = banned_keys.intersection(frame.meta.keys())
    if present:
        raise PolicyViolation(f"never_log_fields_present:{sorted(present)}")


def route_intents(
    frames: Iterable[IntentFrame],
    policy: dict,
) -> list[IntentFrame]:
    allowed_frames: list[IntentFrame] = []
    for frame in frames:
        _ensure_no_banned_fields(frame, policy)
        decision: GateDecision = evaluate(
            {"class": frame.intent_class, "has_consent": frame.meta.get("has_consent")},
            policy,
        )
        if decision.allowed:
            allowed_frames.append(frame)
    return allowed_frames
