import json
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class RunBundle:
    run_id: str
    events: List[Dict[str, Any]]

    def to_json(self) -> str:
        return json.dumps({"run_id": self.run_id, "events": self.events})

    @staticmethod
    def from_json(json_str: str) -> 'RunBundle':
        data = json.loads(json_str)
        return RunBundle(run_id=data["run_id"], events=data["events"])
