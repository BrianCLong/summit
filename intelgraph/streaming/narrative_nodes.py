"""
Narrative Node Definitions for Streaming Intelligence.

Maps to CLAIM-01: Narrative intelligence measures dominant sensemaking stories.
"""

from typing import Dict, Optional, Any

class NarrativeNode:
    """
    Represents a distinct narrative cluster or theme in the streaming graph.
    """
    def __init__(self, narrative_id: str, strength: float = 0.0, attributes: Optional[Dict[str, Any]] = None):
        """
        Initialize a NarrativeNode.

        Args:
            narrative_id (str): Unique identifier for the narrative.
            strength (float): Narrative Strength Index (NSI), indicating dominance.
            attributes (Optional[Dict[str, Any]]): Additional context (e.g., core themes, keywords).
        """
        self.id = narrative_id
        self.strength = strength
        self.attributes = attributes or {}

    def update_strength(self, delta: float) -> float:
        """
        Update the NSI strength of the narrative.
        """
        self.strength += delta
        return self.strength

    def to_dict(self) -> Dict[str, Any]:
        """
        Serialize the node for evidence bundles.
        """
        return {
            "id": self.id,
            "strength": self.strength,
            "attributes": self.attributes,
            "type": "NarrativeNode"
        }
