from abc import ABC, abstractmethod
from typing import Any, Dict


class BackupProvider(ABC):
    @abstractmethod
    def backup(self, destination: str) -> dict[str, Any]:
        """Perform backup to destination. Returns metadata dict."""
        pass

    @abstractmethod
    def restore(self, source: str) -> bool:
        """Restore from source. Returns success status."""
        pass
