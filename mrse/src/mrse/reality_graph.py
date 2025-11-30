from __future__ import annotations

from collections import defaultdict, deque
from typing import DefaultDict, Dict, Iterable, List, Tuple

from .world_state import WorldState


class RealityGraph:
    """Directed graph of world states across simulation horizons."""

    def __init__(self) -> None:
        self.nodes: Dict[str, WorldState] = {}
        self.edges: DefaultDict[str, List[str]] = defaultdict(list)

    def add_state(self, state: WorldState) -> None:
        self.nodes[state.id] = state

    def link(self, parent_id: str, child_id: str) -> None:
        self.edges[parent_id].append(child_id)

    def children(self, node_id: str) -> Iterable[WorldState]:
        for child_id in self.edges.get(node_id, []):
            yield self.nodes[child_id]

    def paths_from(self, root_id: str) -> List[List[WorldState]]:
        paths: List[List[WorldState]] = []
        queue: deque[Tuple[str, List[WorldState]]] = deque()
        queue.append((root_id, [self.nodes[root_id]]))

        while queue:
            node_id, path = queue.popleft()
            if node_id not in self.edges or not self.edges[node_id]:
                paths.append(path)
                continue
            for child_id in self.edges[node_id]:
                queue.append((child_id, path + [self.nodes[child_id]]))
        return paths
