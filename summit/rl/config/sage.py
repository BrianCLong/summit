from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class SAGEConfig:
    """Configuration for SAGE (Self-Hint Aligned GRPO with Privileged Supervision)."""
    enabled: bool = False
    max_hint_length: int = 50
    hint_levels: List[int] = field(default_factory=lambda: [1])
    inference_enabled: bool = False  # STRICT: must be False for inference
