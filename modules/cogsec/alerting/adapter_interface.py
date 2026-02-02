from abc import ABC, abstractmethod
from typing import Dict, List, Any

class AlertAdapter(ABC):
    """
    Interface for Cognitive Security Alert Adapters.
    Adapters ingest signals from external systems and normalize them into CognitiveAlerts.
    """

    @abstractmethod
    def ingest_signal(self, payload: Dict[str, Any]) -> 'CognitiveAlert':
        """
        Convert raw payload into a structured alert.
        """
        pass

    @abstractmethod
    def validate_source(self, source_id: str) -> bool:
        """
        Verify the signal comes from a trusted source.
        """
        pass

class CognitiveAlert:
    def __init__(self, title: str, severity: str, source: str, metadata: Dict[str, Any]):
        self.title = title
        self.severity = severity
        self.source = source
        self.metadata = metadata
        self.status = "NEW"

    def to_dict(self):
        return {
            "title": self.title,
            "severity": self.severity,
            "source": self.source,
            "status": self.status,
            "metadata": self.metadata
        }
