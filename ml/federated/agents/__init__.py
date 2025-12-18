"""
Federated OSINT Agents

Implements autonomous agents for federated OSINT model training
with support for air-gapped operation.
"""

from .osint_trainer_agent import (
    OSINTTrainerAgent,
    AgentConfig,
    TrainingTask,
)
from .coordinator_agent import (
    FederatedCoordinatorAgent,
    CoordinatorConfig,
)
from .airgap_sync_agent import (
    AirgapSyncAgent,
    SyncConfig,
)

__all__ = [
    "OSINTTrainerAgent",
    "AgentConfig",
    "TrainingTask",
    "FederatedCoordinatorAgent",
    "CoordinatorConfig",
    "AirgapSyncAgent",
    "SyncConfig",
]
