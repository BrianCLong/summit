"""
ACP Authentication.
Implements auth methods (agent, env_var, terminal) and enforcement.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal, Optional

AuthType = Literal["agent", "env_var", "terminal"]

@dataclass(frozen=True)
class AuthMethod:
    id: str
    name: str
    description: str
    type: AuthType
    varName: Optional[str] = None          # env_var
    link: Optional[str] = None             # env_var
    args: Optional[list[str]] = None       # terminal
    env: Optional[dict[str, str]] = None   # terminal

def build_terminal_auth_command(agent_argv0: str, method: AuthMethod) -> list[str]:
    if method.type != "terminal":
        raise ValueError("not terminal auth")
    # GATE-ACP-AUTH-001: must invoke the same binary (argv0) — no override.
    extra = list(method.args or [])
    return [agent_argv0] + extra
