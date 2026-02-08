from typing import List, Optional
from .models import AgentManifest
from .storage import FileRegistryStorage

class AgentRegistry:
    def __init__(self, storage: FileRegistryStorage):
        self.storage = storage

    def register_agent(self, manifest: AgentManifest) -> None:
        self.storage.save(manifest)

    def get_agent(self, agent_id: str) -> AgentManifest:
        return self.storage.load(agent_id)

    def list_agents(self) -> List[str]:
        return self.storage.list_agents()

    def deactivate_agent(self, agent_id: str) -> None:
        self.storage.delete(agent_id)
