from abc import ABC, abstractmethod


class DeployAdapter(ABC):
    @abstractmethod
    def deploy(self, project_path: str) -> str:
        """Deploy the project and return an endpoint URL or reference."""
