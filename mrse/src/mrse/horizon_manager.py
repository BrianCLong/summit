from __future__ import annotations

from typing import List

from .reality_graph import RealityGraph
from .state_mutation import StateMutationEngine
from .world_state import WorldState


class HorizonManager:
    """Controls branching simulation across temporal horizons."""

    def __init__(self, mutation_engine: StateMutationEngine):
        self.mutation_engine = mutation_engine

    def generate_trees(self, start_state: WorldState, depth: int = 2) -> RealityGraph:
        graph = RealityGraph()
        graph.add_state(start_state)

        frontier: List[WorldState] = [start_state]
        for _ in range(depth):
            next_frontier: List[WorldState] = []
            for state in frontier:
                children = self.mutation_engine.expand(state)
                for child in children:
                    graph.add_state(child)
                    graph.link(state.id, child.id)
                    next_frontier.append(child)
            frontier = next_frontier
        return graph
