"""
ACP Installer.
Generates plan-only installation steps (no execution).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .policy import AcpPolicy, assert_https_and_allowlisted
from .registry_client import AgentDescriptor, BinaryDist, NpxDist


@dataclass(frozen=True)
class InstallPlan:
    kind: str  # "npx" | "binary"
    argv: list[str]
    env: dict[str, str]
    notes: list[str]

def plan_install(agent: AgentDescriptor, platform_key: str, policy: AcpPolicy) -> InstallPlan:
    if not policy.install_enabled:
        raise ValueError("GATE-ACP-INSTALL-001: install disabled by policy")
    if agent.distribution is None:
        raise ValueError("No distribution available")
    if isinstance(agent.distribution, NpxDist):
        # npx --yes <pkg> <args...>
        argv = ["npx", "--yes", agent.distribution.package] + list(agent.distribution.args)
        return InstallPlan(kind="npx", argv=argv, env=dict(agent.distribution.env), notes=["plan-only"])
    if isinstance(agent.distribution, BinaryDist):
        v = agent.distribution.variants.get(platform_key)
        if not v:
            raise ValueError(f"No binary variant for {platform_key}")
        assert_https_and_allowlisted(v.archive, policy)
        # Download/unpack/exec steps intentionally omitted (plan-only)
        return InstallPlan(kind="binary", argv=[v.cmd] + list(v.args), env=dict(v.env), notes=["plan-only", f"archive={v.archive}"])
    raise ValueError("Unknown distribution type")
