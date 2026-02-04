from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True)
class SandboxPolicy:
    allowed_hosts: tuple[str, ...] = field(default_factory=tuple)
    allow_network: bool = False
    allow_fs: bool = False
    allow_env: bool = False

DEFAULT_POLICY = SandboxPolicy()
