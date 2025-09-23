"""Utilities for generating deceptive subgraphs within IntelGraph.

This module creates honeypot infrastructure entities and links them to
real nodes via `DECOY_OF` edges. Each decoy is watermarked with
`deception_level`, `trap_type`, and `bait_score` metadata so that the
counter‑response agent can reason about the trap that was laid.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field


@dataclass
class DeceptionGraphBuilder:
    """Builds deceptive nodes and edges in an in‑memory graph.

    The builder does not persist anything itself; callers are expected to
    take the generated graph and write it to Neo4j or another backing
    store. A minimal in-memory representation keeps dependencies light
    while providing a familiar graph-like API.
    """

    nodes: dict[str, dict] = field(default_factory=dict)
    edges: dict[tuple[str, str], dict] = field(default_factory=dict)

    def create_decoy(
        self,
        real_node_id: str,
        trap_type: str,
        bait_score: float,
        deception_level: str = "low",
    ) -> str:
        """Create a decoy node and link it to a real node.

        Args:
            real_node_id: Identifier of the production node being mirrored.
            trap_type: The type of trap (e.g., ``honeypot``).
            bait_score: Relative attractiveness of the decoy.
            deception_level: Coarse indicator of sophistication.

        Returns:
            The identifier of the newly created decoy node.
        """

        decoy_id = f"decoy-{uuid.uuid4()}"
        self.nodes[decoy_id] = {
            "label": "DECOY_NODE",
            "deception_level": deception_level,
            "trap_type": trap_type,
            "bait_score": bait_score,
        }
        self.edges[(decoy_id, real_node_id)] = {"type": "DECOY_OF"}
        return decoy_id
