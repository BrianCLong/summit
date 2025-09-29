from abc import ABC, abstractmethod
from typing import List, Dict


class IngestPlugin(ABC):
    """Abstract base class for ingestion plugins."""

    @abstractmethod
    def parse(self, data: str) -> List[Dict]:
        """Parse input data into a list of records."""
        raise NotImplementedError
