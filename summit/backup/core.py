from abc import ABC, abstractmethod
from typing import Dict, Any

class BackupProvider(ABC):
    @abstractmethod
    def backup(self, destination: str) -> Dict[str, Any]:
        """Perform backup to destination. Returns metadata dict."""
        pass

    @abstractmethod
    def restore(self, source: str) -> bool:
        """Restore from source. Returns success status."""
        pass
