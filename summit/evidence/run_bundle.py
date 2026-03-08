import json
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class RunBundle:
    run_id: str
    events: list[dict[str, Any]]

    def to_json(self) -> str:
        return json.dumps({"run_id": self.run_id, "events": self.events})

    @staticmethod
    def from_json(json_str: str) -> 'RunBundle':
        data = json.loads(json_str)
        return RunBundle(run_id=data["run_id"], events=data["events"])
