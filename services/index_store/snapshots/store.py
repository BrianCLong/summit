import uuid
from typing import Dict, Optional

from pydantic import BaseModel


class IndexSnapshot(BaseModel):
    snapshot_id: str
    scope: str
    root_hash: str
class ReuseSession(BaseModel):
    session_id: str
    workspace_id: str
    base_snapshot_id: str
    status: str = "copying"
    target_root_hash: str
class SnapshotStore:
    def __init__(self):
        self.snapshots = {}
        self.sessions = {}
    def save_snapshot(self, s): self.snapshots[s.snapshot_id] = s
    def get_snapshot(self, sid): return self.snapshots.get(sid)
    def create_session(self, ws_id, snap_id, target_root):
        sid = str(uuid.uuid4())
        s = ReuseSession(session_id=sid, workspace_id=ws_id, base_snapshot_id=snap_id, target_root_hash=target_root)
        self.sessions[sid] = s
        return s
    def update_status(self, sid, status):
        if sid in self.sessions: self.sessions[sid].status = status
