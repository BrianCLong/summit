import json
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class SessionState(BaseModel):
    session_id: str
    step: int
    history: List[Dict[str, Any]]
    metadata: Dict[str, Any] = {}

class CheckpointManager:
    def __init__(self, checkpoint_dir: str = "artifacts/checkpoints"):
        self.checkpoint_dir = checkpoint_dir
        os.makedirs(self.checkpoint_dir, exist_ok=True)

    def _get_path(self, session_id: str, step: int) -> str:
        return os.path.join(self.checkpoint_dir, f"chk_{session_id}_{step:04d}.json")

    def save_checkpoint(self, state: SessionState) -> str:
        path = self._get_path(state.session_id, state.step)
        with open(path, "w") as f: f.write(state.model_dump_json(indent=2))
        return path

    def load_checkpoint(self, session_id: str, step: int) -> SessionState:
        path = self._get_path(session_id, step)
        with open(path, "r") as f: data = json.load(f)
        return SessionState.model_validate(data)

    def get_latest_step(self, session_id: str) -> int:
        import re
        pattern = re.compile(rf"^chk_{re.escape(session_id)}_(\d{{4}})\.json$")
        steps = []
        for f in os.listdir(self.checkpoint_dir):
            match = pattern.match(f)
            if match:
                steps.append(int(match.group(1)))
        return max(steps) if steps else -1
