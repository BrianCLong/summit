from __future__ import annotations

import os
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, Optional

from .scoring import Score
from .signals import StreamEvent

EVD = "EVD-AIDISINFO25-EAD-001"

@dataclass
class EADState:
    window_ms: int = 5 * 60 * 1000
    per_content: dict[str, deque[int]] = None
    def __post_init__(self):
        if self.per_content is None:
            self.per_content = defaultdict(deque)

def ead_detector(state: EADState):
    def _d(e: StreamEvent) -> Score:
        if os.environ.get("EAD_ENABLED", "1") == "0":
            return Score(0.0, [], [])

        if e.content_id is None:
            return Score(0.0, [], [])
        q = state.per_content[e.content_id]
        q.append(e.ts_ms)
        # drop old
        cutoff = e.ts_ms - state.window_ms
        while q and q[0] < cutoff:
            q.popleft()

        burst = len(q)
        risk = 0.0
        reasons = []

        burst_threshold = 50
        if os.environ.get("SANDBOX_MODE") == "1":
            burst_threshold = 100

        if burst >= burst_threshold:
            risk += 0.5
            reasons.append(f"burst>={burst_threshold}/5m")
        if e.event_type in ("reply", "mention") and e.mentioned_actor_id is not None:
            risk += 0.2
            reasons.append("mention-targeting")
        if e.actor_age_days is not None and e.actor_age_days < 7:
            risk += 0.2
            reasons.append("new-account")
        if e.actor_is_verified is False:
            risk += 0.1
            reasons.append("unverified-actor")

        return Score(min(risk, 1.0), reasons, [EVD] if reasons else [])
    return _d
