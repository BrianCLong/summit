from abc import ABC, abstractmethod
from typing import Dict

class GitProvider(ABC):
    @abstractmethod
    def publish_project(self, files: Dict[str, str], dest: str) -> str:
        """Return a reference (path/url)."""
