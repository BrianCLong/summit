import json
import os
from typing import Dict, Any, List
from .models import AgentManifest

class FileRegistryStorage:
    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_path(self, agent_id: str) -> str:
        return os.path.join(self.storage_dir, f"{agent_id}.json")

    def save(self, manifest: AgentManifest) -> None:
        path = self._get_path(manifest.agent_id)
        with open(path, "w") as f:
            f.write(manifest.model_dump_json(indent=2))

    def load(self, agent_id: str) -> AgentManifest:
        path = self._get_path(agent_id)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Agent manifest for {agent_id} not found.")
        with open(path, "r") as f:
            data = json.load(f)
        return AgentManifest.model_validate(data)

    def list_agents(self) -> List[str]:
        agents = []
        for filename in os.listdir(self.storage_dir):
            if filename.endswith(".json"):
                agents.append(filename[:-5])
        return agents

    def delete(self, agent_id: str) -> None:
        path = self._get_path(agent_id)
        if os.path.exists(path):
            os.remove(path)
