from typing import Any

ALLOWED_STANCES = {"support", "oppose", "neutral", None}


def is_valid_frame_label(label: Any) -> bool:
    if label is None:
        return False
    if not isinstance(label.frame, str) or not label.frame.strip():
        return False
    if label.frame == "unknown":
        return False
    if label.stance not in ALLOWED_STANCES:
        return False
    if not isinstance(label.confidence, float):
        return False
    if not (0.0 <= label.confidence <= 1.0):
        return False
    if not isinstance(label.method, str) or not label.method.strip():
        return False
    return True
