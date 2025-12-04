"""
Synchronization Manager for Federated Learning

Manages state synchronization across federated nodes.
"""

import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class SyncState(Enum):
    IDLE = "idle"
    SYNCING = "syncing"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class SyncRecord:
    sync_id: str
    source_node: str
    target_node: str
    round_number: int
    state: SyncState
    started_at: float
    completed_at: Optional[float] = None
    error: Optional[str] = None


class SyncManager:
    """Manages synchronization between federated nodes"""

    def __init__(self, node_id: str):
        self.node_id = node_id
        self.state = SyncState.IDLE
        self._sync_history: List[SyncRecord] = []
        self._pending_syncs: Dict[str, SyncRecord] = {}

        logger.info(f"Sync manager initialized for node {node_id}")

    def initiate_sync(
        self,
        target_node: str,
        round_number: int,
        data: Any,
    ) -> str:
        """Initiate synchronization with target node"""
        sync_id = f"sync_{self.node_id}_{target_node}_{int(time.time())}"

        record = SyncRecord(
            sync_id=sync_id,
            source_node=self.node_id,
            target_node=target_node,
            round_number=round_number,
            state=SyncState.SYNCING,
            started_at=time.time(),
        )

        self._pending_syncs[sync_id] = record
        self.state = SyncState.SYNCING

        logger.info(f"Initiated sync {sync_id} to {target_node}")
        return sync_id

    def complete_sync(self, sync_id: str, success: bool = True, error: str = None):
        """Mark synchronization as completed"""
        if sync_id not in self._pending_syncs:
            return

        record = self._pending_syncs.pop(sync_id)
        record.completed_at = time.time()
        record.state = SyncState.COMPLETED if success else SyncState.ERROR
        record.error = error

        self._sync_history.append(record)
        self.state = SyncState.IDLE if not self._pending_syncs else SyncState.SYNCING

        logger.info(f"Sync {sync_id} {'completed' if success else 'failed'}")

    def get_sync_status(self) -> Dict[str, Any]:
        """Get synchronization status"""
        return {
            "node_id": self.node_id,
            "state": self.state.value,
            "pending_syncs": len(self._pending_syncs),
            "completed_syncs": len(self._sync_history),
            "recent_syncs": [
                {
                    "sync_id": r.sync_id,
                    "target": r.target_node,
                    "round": r.round_number,
                    "state": r.state.value,
                }
                for r in self._sync_history[-5:]
            ],
        }
