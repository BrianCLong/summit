from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class SafeLLMSummary:
    bullets: List[str]            # max 6, each <= 160 chars (enforced in tests)
    key_drivers: List[str]        # signal keys only
    uncertainty: List[str]        # explicit limitations
    next_steps: List[str]         # must be subset of ALLOWED_NEXT_STEPS
