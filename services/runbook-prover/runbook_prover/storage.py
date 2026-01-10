import json
from pathlib import Path

from .models import RunState


class Storage:
    def __init__(self, runs_dir: Path):
        self.runs_dir = runs_dir
        self.runs_dir.mkdir(parents=True, exist_ok=True)

    def run_path(self, run_id: str) -> Path:
        return self.runs_dir / f"{run_id}.json"

    def save_run(self, state: RunState) -> None:
        path = self.run_path(state.run_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, indent=2)

    def load_run(self, run_id: str) -> RunState:
        path = self.run_path(run_id)
        with open(path, encoding="utf-8") as f:
            data: dict = json.load(f)
        return RunState.from_dict(data)

    def exists(self, run_id: str) -> bool:
        return self.run_path(run_id).exists()

    def list_runs(self):
        return sorted(self.runs_dir.glob("*.json"))
