import pytest
import os
import shutil
from maestro.runtime.compaction.compactor import ContextCompactor
from maestro.runtime.sessions.checkpoints.manager import CheckpointManager, SessionState

def test_deterministic_compaction():
    compactor = ContextCompactor()
    history = [{"event": "start", "evidence_id": "EVID-001"}]
    summary1 = compactor.compact(history)
    summary2 = compactor.compact(history)
    assert summary1 == summary2

def test_checkpoint_manager():
    checkpoint_dir = "tests/temp_checkpoints_v2"
    if os.path.exists(checkpoint_dir):
        shutil.rmtree(checkpoint_dir)
    manager = CheckpointManager(checkpoint_dir)
    state = SessionState(session_id="sess-abc", step=1, history=[])
    manager.save_checkpoint(state)
    assert manager.get_latest_step("sess-abc") == 1
    shutil.rmtree(checkpoint_dir)
