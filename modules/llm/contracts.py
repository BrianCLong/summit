from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class SafeLLMSummary:
    bullets: list[str]            # max 6, each <= 160 chars (enforced in tests)
    key_drivers: list[str]        # signal keys only
    uncertainty: list[str]        # explicit limitations
    next_steps: list[str]         # must be subset of ALLOWED_NEXT_STEPS
