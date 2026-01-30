from abc import ABC, abstractmethod
from typing import Dict


class GitProvider(ABC):
    @abstractmethod
    def publish_project(self, files: dict[str, str], dest: str) -> str:
        """Return a reference (path/url)."""
