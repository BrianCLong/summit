# src/auto_scientist/graph.py
from __future__ import annotations
from uuid import UUID
from typing import Iterable, Optional

from .schemas import Node, Edge, NodeType, EdgeType, ExperimentGraphModel
from .storage import StorageBackend

class ExperimentGraph:
    """
    The primary interface for interacting with the state of the research.

    This class orchestrates changes to the graph and ensures they are persisted
    through the provided storage backend. It exposes high-level methods for
    querying and manipulating the graph.
    """
    def __init__(self, storage: StorageBackend):
        self._storage = storage
        self._model = self._storage.load_graph()

    @property
    def nodes(self) -> dict[UUID, Node]:
        return self._model.nodes

    @property
    def edges(self) -> list[Edge]:
        return self._model.edges

    def _commit(self) -> None:
        """Atomically saves the current state of the graph model."""
        self._storage.save_graph(self._model)

    def add_node(self, node: Node) -> None:
        """Adds a node to the graph and persists the change."""
        if node.id in self._model.nodes:
            raise ValueError(f"Node {node.id} already exists")
        self._model.nodes[node.id] = node
        self._commit()

    def add_edge(self, source_id: UUID, target_id: UUID, type: EdgeType) -> None:
        """Adds an edge to the graph and persists the change."""
        if source_id not in self._model.nodes or target_id not in self._model.nodes:
            raise ValueError("Both source and target must exist in the graph")
        edge = Edge(source=source_id, target=target_id, type=type)
        self._model.edges.append(edge)
        self._commit()

    def get_node(self, node_id: UUID) -> Node:
        """Retrieves a node by its ID."""
        if node_id not in self._model.nodes:
            raise KeyError(f"Node with ID {node_id} not found")
        return self._model.nodes[node_id]

    def successors(self, node_id: UUID, edge_type: Optional[EdgeType] = None) -> Iterable[Node]:
        """Finds all direct successors of a given node."""
        for e in self._model.edges:
            if e.source == node_id and (edge_type is None or e.type == edge_type):
                yield self.get_node(e.target)

    def predecessors(self, node_id: UUID, edge_type: Optional[EdgeType] = None) -> Iterable[Node]:
        """Finds all direct predecessors of a given node."""
        for e in self._model.edges:
            if e.target == node_id and (edge_type is None or e.type == edge_type):
                yield self.get_node(e.source)

    def nodes_by_type(self, type_: NodeType) -> Iterable[Node]:
        """Returns an iterator over all nodes of a specific type."""
        return (n for n in self._model.nodes.values() if n.type == type_)

    def to_dict(self) -> dict:
        """Returns a serializable dictionary representation of the graph."""
        return self._model.model_dump(mode="json")
