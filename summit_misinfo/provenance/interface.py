from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass
class ProvenanceVerdict:
    verified: bool
    signer: Optional[str]
    timestamp: Optional[str]

class ProvenanceVerifier(Protocol):
    def verify(self, media_path: str) -> ProvenanceVerdict:
        ...

def is_sandbox_mode() -> bool:
    """
    Returns True if the environment is in SANDBOX_MODE (relaxed thresholds).
    Note: Schema gates and strict security checks are NEVER bypassed.
    """
    return os.environ.get("SANDBOX_MODE") == "1"
