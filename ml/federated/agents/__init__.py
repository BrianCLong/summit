"""
Federated OSINT Agents

Implements autonomous agents for federated OSINT model training
with support for air-gapped operation.
"""

from .airgap_sync_agent import (
    AirgapSyncAgent,
    SyncConfig,
)
from .coordinator_agent import (
    CoordinatorConfig,
    FederatedCoordinatorAgent,
)
from .osint_trainer_agent import (
    AgentConfig,
    OSINTTrainerAgent,
    TrainingTask,
)

__all__ = [
    "AgentConfig",
    "AirgapSyncAgent",
    "CoordinatorConfig",
    "FederatedCoordinatorAgent",
    "OSINTTrainerAgent",
    "SyncConfig",
    "TrainingTask",
]
