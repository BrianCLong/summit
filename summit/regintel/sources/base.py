from abc import ABC, abstractmethod
from typing import List, Optional
from .snapshot import SourceSnapshot

class BaseConnector(ABC):
    """
    Abstract base class for Regulatory Intelligence Source Connectors.
    Supports both online fetching and offline mirror loading.
    """

    def __init__(self, offline_mode: bool = False, mirror_root: Optional[str] = None):
        self.offline_mode = offline_mode
        self.mirror_root = mirror_root

    @abstractmethod
    def fetch(self) -> List[SourceSnapshot]:
        """
        Retrieves the latest content from the source.
        In offline mode, should read from the local mirror.
        In online mode, should fetch from the web and optionally update the mirror.
        """
        pass

    @abstractmethod
    def get_source_id(self) -> str:
        """
        Returns the unique identifier for this source.
        """
        pass
