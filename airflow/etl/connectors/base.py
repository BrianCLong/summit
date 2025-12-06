from abc import ABC, abstractmethod
from typing import Iterator, Dict, Any, List

class BaseConnector(ABC):
    """
    Abstract base class for data connectors.
    """

    @abstractmethod
    def fetch_data(self, limit: int = 100) -> Iterator[Dict[str, Any]]:
        """
        Fetches data from the source.

        Args:
            limit: Maximum number of records to fetch.

        Yields:
            Dictionary representing a single data record.
        """
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Returns the name of the data source."""
        pass
