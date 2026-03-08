from typing import Any, Dict, Optional

from .base import FrameLabel


def extract_frame(event: dict[str, Any]) -> FrameLabel:
    """Deterministic stub: map via provided synthetic tag."""
    tag = event.get("synthetic_frame", "unknown")
    stance: Optional[str] = event.get("synthetic_stance")
    confidence_value = event.get("synthetic_confidence", 0.5)
    return FrameLabel(
        frame=tag,
        stance=stance,
        confidence=float(confidence_value),
        method="stub",
    )
