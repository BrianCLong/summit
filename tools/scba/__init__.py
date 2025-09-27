"""Side-Channel Budget Auditor (SCBA).

This package provides utilities for measuring side-channel leakage across
services and enforcing per-endpoint leak budgets. It exposes a Python API,
with a thin Go wrapper located in ``tools/scba/cmd`` for teams that prefer a
static binary interface.
"""

from .attacks import CoarseTimerAttack, LengthLeakAttack, CacheWarmAttack
from .policies import LeakBudget, EndpointPolicy, PolicyStore
from .runner import SideChannelBudgetAuditor, AuditFinding

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
