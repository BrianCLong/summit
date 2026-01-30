from dataclasses import dataclass


@dataclass(frozen=True)
class CodeModeFlags:
    enabled: bool = False
    sandbox_mode: str = "disabled"  # disabled|local
    allow_network: bool = False     # deny-by-default

DEFAULT_FLAGS = CodeModeFlags()
