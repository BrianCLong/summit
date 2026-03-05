"""
Narrative Edge Definitions for Streaming Intelligence.

Maps to CLAIM-02: Streaming graph systems now support standing queries and real-time inference.
"""

from typing import Any, Dict, Optional


class NarrativeEdge:
    """
    Represents a directed relationship between two nodes in the narrative graph.
    """

    # Relationship Types
    AMPLIFIES = "AMPLIFIES"
    CORROBORATES = "CORROBORATES"
    CONTRADICTS = "CONTRADICTS"
    ORIGINATES_FROM = "ORIGINATES_FROM"

    def __init__(
        self,
        source_id: str,
        target_id: str,
        relation_type: str,
        weight: float = 1.0,
        timestamp: Optional[float] = None
    ):
        """
        Initialize a NarrativeEdge.

        Args:
            source_id (str): ID of the source node.
            target_id (str): ID of the target node.
            relation_type (str): Type of relationship (e.g., AMPLIFIES).
            weight (float): Weight of the connection (default 1.0).
            timestamp (Optional[float]): Timestamp of the edge creation/observation.
        """
        self.source_id = source_id
        self.target_id = target_id
        self.relation_type = relation_type
        self.weight = weight
        self.timestamp = timestamp

    def to_dict(self) -> dict[str, Any]:
        """
        Serialize the edge for evidence bundles.
        """
        return {
            "source": self.source_id,
            "target": self.target_id,
            "relation": self.relation_type,
            "weight": self.weight,
            "timestamp": self.timestamp,
            "type": "NarrativeEdge"
        }
