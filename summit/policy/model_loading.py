from __future__ import annotations
from dataclasses import dataclass, field
from typing import Set

@dataclass(frozen=True)
class ModelLoadingPolicy:
    allow_remote_code: bool = False
    remote_code_allowlist: Set[str] = field(default_factory=set)

    def can_trust_remote_code(self, model_id: str) -> bool:
        return self.allow_remote_code and (model_id in self.remote_code_allowlist)
