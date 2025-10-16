"""Side-Channel Budget Auditor (SCBA).

This package provides utilities for measuring side-channel leakage across
services and enforcing per-endpoint leak budgets. It exposes a Python API,
with a thin Go wrapper located in ``tools/scba/cmd`` for teams that prefer a
static binary interface.
"""

from .attacks import CacheWarmAttack, CoarseTimerAttack, LengthLeakAttack
from .policies import EndpointPolicy, LeakBudget, PolicyStore
from .runner import AuditFinding, SideChannelBudgetAuditor

__all__ = [
    "CoarseTimerAttack",
    "LengthLeakAttack",
    "CacheWarmAttack",
    "LeakBudget",
    "EndpointPolicy",
    "SideChannelBudgetAuditor",
    "AuditFinding",
    "PolicyStore",
]
