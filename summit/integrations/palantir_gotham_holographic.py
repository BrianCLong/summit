from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import math
import random
import copy

@dataclass
class VectorSymbolicNode:
    id: str
    properties: Dict[str, Any]
    embedding: List[float] # High-dimensional vector

class HolographicGraph:
    """
    Advanced Gotham Superset: Vector-Symbolic Reasoning + Causal Simulation.
    """
    def __init__(self):
        self.nodes: Dict[str, VectorSymbolicNode] = {}
        self.edges: List[Dict] = []

    def add_node(self, id: str, embedding: List[float]):
        self.nodes[id] = VectorSymbolicNode(id, {}, embedding)

    def add_edge(self, src: str, tgt: str, type: str):
        self.edges.append({"source": src, "target": tgt, "type": type})

    def find_similar_by_vector(self, query_vec: List[float], top_k: int = 3) -> List[str]:
        """
        Cosine similarity search in the Knowledge Plane.
        """
        scored = []
        for nid, node in self.nodes.items():
            score = self._cosine_sim(query_vec, node.embedding)
            scored.append((score, nid))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [nid for _, nid in scored[:top_k]]

    def _cosine_sim(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a*b for a,b in zip(v1, v2))
        norm_a = math.sqrt(sum(a*a for a in v1))
        norm_b = math.sqrt(sum(b*b for b in v2))
        if norm_a == 0 or norm_b == 0: return 0.0
        return dot / (norm_a * norm_b)

class CounterfactualSimulator:
    """
    Simulates "What If" scenarios by branching graph state.
    """
    def __init__(self, graph: HolographicGraph):
        self.base_graph = graph

    def simulate_intervention(self, action: str, target_id: str) -> str:
        """
        Forks the graph, applies action, and diffs the outcome.
        """
        # 1. Fork
        sim_graph = copy.deepcopy(self.base_graph)

        # 2. Intervene
        if action == "delete_node":
            if target_id in sim_graph.nodes:
                del sim_graph.nodes[target_id]
                # Cascade delete edges
                sim_graph.edges = [e for e in sim_graph.edges if e['source'] != target_id and e['target'] != target_id]

        # 3. Simulate Diffusion (Mock)
        # E.g., if a central node is removed, the network might fragment
        # Here we just count disconnected components impact

        diff = len(self.base_graph.nodes) - len(sim_graph.nodes)
        edge_diff = len(self.base_graph.edges) - len(sim_graph.edges)

        return f"Impact: Removed {diff} nodes, Severed {edge_diff} edges."

class CausalInferenceEngine:
    """
    Uses Do-Calculus logic to distinguish correlation from causation.
    """
    def infer_causality(self, cause: str, effect: str) -> float:
        """
        Returns a P(Effect | do(Cause)) score.
        Mock implementation.
        """
        # Check if direct edge exists
        # In a real engine, we'd check for confounders and back-door paths
        return random.uniform(0.0, 1.0)
