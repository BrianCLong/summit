"""
Graph Merger for Federated Learning

Implements strategies for merging graph updates from
multiple federated nodes with conflict resolution.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class MergeStrategy(Enum):
    """Graph merge strategies"""

    UNION = "union"  # Keep all unique nodes/edges
    INTERSECTION = "intersection"  # Only keep common elements
    WEIGHTED = "weighted"  # Weight by confidence/source count
    LATEST = "latest"  # Latest update wins
    CONSENSUS = "consensus"  # Require multiple sources


@dataclass
class GraphNode:
    """Node in federated graph"""

    node_id: str
    node_type: str
    properties: Dict[str, Any]
    confidence: float
    sources: Set[str]
    timestamp: float


@dataclass
class GraphEdge:
    """Edge in federated graph"""

    source_id: str
    target_id: str
    edge_type: str
    properties: Dict[str, Any]
    confidence: float
    sources: Set[str]
    timestamp: float


class GraphMerger:
    """
    Merge graphs from multiple federated nodes

    Features:
    - Multiple merge strategies
    - Conflict resolution
    - Confidence-based weighting
    - Provenance tracking
    """

    def __init__(
        self,
        strategy: MergeStrategy = MergeStrategy.WEIGHTED,
        min_confidence: float = 0.3,
        consensus_threshold: int = 2,
    ):
        self.strategy = strategy
        self.min_confidence = min_confidence
        self.consensus_threshold = consensus_threshold

        self._merged_nodes: Dict[str, GraphNode] = {}
        self._merged_edges: Dict[str, GraphEdge] = {}

    def merge_graphs(
        self,
        graphs: List[Dict[str, Any]],
        source_ids: List[str],
    ) -> Dict[str, Any]:
        """
        Merge multiple graphs from federated nodes

        Args:
            graphs: List of graph dictionaries with 'nodes' and 'edges'
            source_ids: List of source node IDs

        Returns:
            Merged graph dictionary
        """
        if len(graphs) != len(source_ids):
            raise ValueError("Number of graphs must match number of source IDs")

        # Reset merged state
        self._merged_nodes.clear()
        self._merged_edges.clear()

        # Process each graph
        for graph, source_id in zip(graphs, source_ids):
            self._process_graph(graph, source_id)

        # Apply merge strategy
        if self.strategy == MergeStrategy.UNION:
            merged = self._merge_union()
        elif self.strategy == MergeStrategy.INTERSECTION:
            merged = self._merge_intersection(len(graphs))
        elif self.strategy == MergeStrategy.WEIGHTED:
            merged = self._merge_weighted()
        elif self.strategy == MergeStrategy.LATEST:
            merged = self._merge_latest()
        elif self.strategy == MergeStrategy.CONSENSUS:
            merged = self._merge_consensus()
        else:
            merged = self._merge_union()

        logger.info(
            f"Merged {len(graphs)} graphs using {self.strategy.value} strategy: "
            f"{len(merged['nodes'])} nodes, {len(merged['edges'])} edges"
        )

        return merged

    def _process_graph(self, graph: Dict[str, Any], source_id: str) -> None:
        """Process a single graph from a federated node"""
        import time

        # Process nodes
        for node_data in graph.get("nodes", []):
            node_id = node_data.get("id")
            if not node_id:
                continue

            if node_id in self._merged_nodes:
                # Update existing node
                existing = self._merged_nodes[node_id]
                existing.sources.add(source_id)
                existing.confidence = max(
                    existing.confidence,
                    node_data.get("confidence", 0.5),
                )
                existing.timestamp = max(
                    existing.timestamp,
                    node_data.get("timestamp", time.time()),
                )
                # Merge properties
                for key, value in node_data.get("properties", {}).items():
                    if key not in existing.properties:
                        existing.properties[key] = value
            else:
                # Create new node
                self._merged_nodes[node_id] = GraphNode(
                    node_id=node_id,
                    node_type=node_data.get("type", "Unknown"),
                    properties=node_data.get("properties", {}),
                    confidence=node_data.get("confidence", 0.5),
                    sources={source_id},
                    timestamp=node_data.get("timestamp", time.time()),
                )

        # Process edges
        for edge_data in graph.get("edges", []):
            source = edge_data.get("source")
            target = edge_data.get("target")
            if not source or not target:
                continue

            edge_key = f"{source}->{target}:{edge_data.get('type', 'RELATED')}"

            if edge_key in self._merged_edges:
                # Update existing edge
                existing = self._merged_edges[edge_key]
                existing.sources.add(source_id)
                existing.confidence = max(
                    existing.confidence,
                    edge_data.get("confidence", 0.5),
                )
                existing.timestamp = max(
                    existing.timestamp,
                    edge_data.get("timestamp", time.time()),
                )
            else:
                # Create new edge
                self._merged_edges[edge_key] = GraphEdge(
                    source_id=source,
                    target_id=target,
                    edge_type=edge_data.get("type", "RELATED"),
                    properties=edge_data.get("properties", {}),
                    confidence=edge_data.get("confidence", 0.5),
                    sources={source_id},
                    timestamp=edge_data.get("timestamp", time.time()),
                )

    def _merge_union(self) -> Dict[str, Any]:
        """Union merge - keep all elements above confidence threshold"""
        nodes = [
            self._node_to_dict(n)
            for n in self._merged_nodes.values()
            if n.confidence >= self.min_confidence
        ]

        edges = [
            self._edge_to_dict(e)
            for e in self._merged_edges.values()
            if e.confidence >= self.min_confidence
        ]

        return {"nodes": nodes, "edges": edges}

    def _merge_intersection(self, num_sources: int) -> Dict[str, Any]:
        """Intersection merge - only keep elements from all sources"""
        nodes = [
            self._node_to_dict(n)
            for n in self._merged_nodes.values()
            if len(n.sources) == num_sources and n.confidence >= self.min_confidence
        ]

        edges = [
            self._edge_to_dict(e)
            for e in self._merged_edges.values()
            if len(e.sources) == num_sources and e.confidence >= self.min_confidence
        ]

        return {"nodes": nodes, "edges": edges}

    def _merge_weighted(self) -> Dict[str, Any]:
        """Weighted merge - boost confidence by source count"""
        nodes = []
        for node in self._merged_nodes.values():
            # Boost confidence based on number of sources
            boosted_confidence = min(
                1.0,
                node.confidence * (1 + 0.1 * (len(node.sources) - 1)),
            )
            if boosted_confidence >= self.min_confidence:
                node_dict = self._node_to_dict(node)
                node_dict["confidence"] = boosted_confidence
                nodes.append(node_dict)

        edges = []
        for edge in self._merged_edges.values():
            boosted_confidence = min(
                1.0,
                edge.confidence * (1 + 0.1 * (len(edge.sources) - 1)),
            )
            if boosted_confidence >= self.min_confidence:
                edge_dict = self._edge_to_dict(edge)
                edge_dict["confidence"] = boosted_confidence
                edges.append(edge_dict)

        return {"nodes": nodes, "edges": edges}

    def _merge_latest(self) -> Dict[str, Any]:
        """Latest merge - most recent update wins"""
        nodes = [
            self._node_to_dict(n)
            for n in self._merged_nodes.values()
            if n.confidence >= self.min_confidence
        ]

        edges = [
            self._edge_to_dict(e)
            for e in self._merged_edges.values()
            if e.confidence >= self.min_confidence
        ]

        return {"nodes": nodes, "edges": edges}

    def _merge_consensus(self) -> Dict[str, Any]:
        """Consensus merge - require minimum source agreement"""
        nodes = [
            self._node_to_dict(n)
            for n in self._merged_nodes.values()
            if len(n.sources) >= self.consensus_threshold
            and n.confidence >= self.min_confidence
        ]

        edges = [
            self._edge_to_dict(e)
            for e in self._merged_edges.values()
            if len(e.sources) >= self.consensus_threshold
            and e.confidence >= self.min_confidence
        ]

        return {"nodes": nodes, "edges": edges}

    def _node_to_dict(self, node: GraphNode) -> Dict[str, Any]:
        """Convert GraphNode to dictionary"""
        return {
            "id": node.node_id,
            "type": node.node_type,
            "properties": node.properties,
            "confidence": node.confidence,
            "sources": list(node.sources),
            "timestamp": node.timestamp,
        }

    def _edge_to_dict(self, edge: GraphEdge) -> Dict[str, Any]:
        """Convert GraphEdge to dictionary"""
        return {
            "source": edge.source_id,
            "target": edge.target_id,
            "type": edge.edge_type,
            "properties": edge.properties,
            "confidence": edge.confidence,
            "sources": list(edge.sources),
            "timestamp": edge.timestamp,
        }

    def get_merge_statistics(self) -> Dict[str, Any]:
        """Get statistics about the merge operation"""
        source_distribution = {}
        for node in self._merged_nodes.values():
            count = len(node.sources)
            source_distribution[count] = source_distribution.get(count, 0) + 1

        return {
            "total_nodes": len(self._merged_nodes),
            "total_edges": len(self._merged_edges),
            "source_distribution": source_distribution,
            "avg_node_confidence": np.mean([
                n.confidence for n in self._merged_nodes.values()
            ]) if self._merged_nodes else 0,
            "avg_edge_confidence": np.mean([
                e.confidence for e in self._merged_edges.values()
            ]) if self._merged_edges else 0,
        }
