from __future__ import annotations

import re
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class StateEvent:
    state: str
    timestamp: float
    detail: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"state": self.state, "timestamp": self.timestamp}
        if self.detail:
            payload["detail"] = self.detail
        return payload


ALLOWED_TRANSITIONS = {
    None: {"SUBMITTED"},
    "SUBMITTED": {"VALIDATED", "DENIED"},
    "VALIDATED": {"RUNNING", "DENIED"},
    "RUNNING": {"FAILED", "COMPLETED"},
    "FAILED": set(),
    "COMPLETED": set(),
    "DENIED": set(),
}


class StateStore:
    _safe_step_pattern = re.compile(r"[^a-zA-Z0-9_.-]+")

    def __init__(self, root: Path):
        self.root = root
        self.jobs_dir = root / "jobs"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

    def job_dir(self, job_id: str) -> Path:
        job_dir = self.jobs_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    def state_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "state.json"

    def spec_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "spec.json"

    def logs_dir(self, job_id: str) -> Path:
        path = self.job_dir(job_id) / "logs"
        path.mkdir(exist_ok=True)
        return path

    def write_spec(self, job_id: str, spec: Dict[str, Any]) -> None:
        self.spec_path(job_id).write_text(json.dumps(spec, indent=2))

    def append_state(self, job_id: str, state: str, detail: Optional[str] = None) -> None:
        path = self.state_path(job_id)
        events: List[Dict[str, Any]] = []
        if path.exists():
            events = json.loads(path.read_text())
        prior_state = events[-1]["state"] if events else None
        if state not in ALLOWED_TRANSITIONS.get(prior_state, set()):
            raise ValueError(f"Illegal transition from {prior_state} to {state}")
        events.append(StateEvent(state=state, timestamp=time.time(), detail=detail).to_dict())
        path.write_text(json.dumps(events, indent=2))

    def get_events(self, job_id: str) -> List[Dict[str, Any]]:
        path = self.state_path(job_id)
        if not path.exists():
            return []
        return json.loads(path.read_text())

    def latest_state(self, job_id: str) -> Optional[str]:
        events = self.get_events(job_id)
        if not events:
            return None
        return events[-1]["state"]

    def write_step_log(self, job_id: str, step_id: str, content: str) -> Path:
        safe_step_id = self._safe_step_pattern.sub("_", step_id).strip("._-") or "step"
        path = self.logs_dir(job_id) / f"{safe_step_id}.log"
        path.write_text(content)
        return path

    def read_all_logs(self, job_id: str) -> Dict[str, str]:
        path = self.logs_dir(job_id)
        if not path.exists():
            return {}
        logs = {}
        for log_file in sorted(path.glob("*.log")):
            logs[log_file.name] = log_file.read_text()
        return logs
