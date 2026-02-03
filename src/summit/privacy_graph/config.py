from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class PrivacyGraphConfig:
    enabled: bool = False
    require_dp: bool = True
    backend: str = "plaintext"  # plaintext|he_simulated
    dp_epsilon: Optional[float] = None
    dp_delta: Optional[float] = None
    max_degree: int = 64
