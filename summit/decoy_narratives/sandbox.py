"""
Commander's Intent:
Establish a Decoy-Aware GraphRAG Sandbox that simulates adversarial behavior
and evaluates early-warning metrics within an explicitly separated,
test-only environment. This sandbox measures interactions with the
synthetic Decoy Narrative Lattice from PR 1, improving model robustness.

Abuse Analysis:
Sandbox functionality could unintentionally modify production graph stores if
misconfigured. We guarantee isolation by exclusively running in memory or an
explicitly segregated schema, and strictly enforcing the `is_decoy` tagging.
Metrics collected here are for evaluation and early-warning only; they
trigger no automatic or real-world policy enforcement.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .model import DecoyLattice, DecoyNarrativeNode, DecoyRelation


class SandboxGraph(BaseModel):
    """
    In-memory representation of a GraphRAG test graph consisting of
    synthetic narrative nodes and Decoy Lattices.
    """
    real_ish_nodes: list[dict[str, Any]] = Field(default_factory=list)
    real_ish_relations: list[dict[str, Any]] = Field(default_factory=list)
    lattices: list[DecoyLattice] = Field(default_factory=list)

    def add_lattice(self, lattice: DecoyLattice):
        self.lattices.append(lattice)

    def add_real_ish_node(self, node: dict[str, Any]):
        node['is_decoy'] = False
        self.real_ish_nodes.append(node)

    def add_real_ish_relation(self, relation: dict[str, Any]):
        relation['is_decoy'] = False
        self.real_ish_relations.append(relation)

class SandboxMetrics(BaseModel):
    decoy_attraction_score: float = 0.0
    brittle_dependency_score: float = 0.0
    early_warning_lead_time: float = 0.0

class SandboxLoader:
    def __init__(self, sandbox_graph: SandboxGraph):
        self.graph = sandbox_graph
        self._all_nodes = self.graph.real_ish_nodes.copy()
        self._all_relations = self.graph.real_ish_relations.copy()

        for lat in self.graph.lattices:
            for n in lat.nodes:
                self._all_nodes.append(n.model_dump())
            for r in lat.relations:
                self._all_relations.append(r.model_dump())

    def get_all_nodes(self) -> list[dict[str, Any]]:
        return self._all_nodes

    def get_all_relations(self) -> list[dict[str, Any]]:
        return self._all_relations

def compute_early_warning_metrics(
    sandbox_loader: SandboxLoader,
    simulated_hits: list[str],
    simulated_paths: list[list[str]]
) -> SandboxMetrics:
    """
    Computes early-warning metrics for a given sandbox run.
    """
    metrics = SandboxMetrics()

    # 1. decoy_attraction_score: hit rate on decoy nodes vs total hits
    total_hits = len(simulated_hits)
    if total_hits > 0:
        decoy_hits = 0
        all_nodes = sandbox_loader.get_all_nodes()
        decoy_ids = [n.get('decoy_id') for n in all_nodes if n.get('is_decoy')]

        for hit in simulated_hits:
            if hit in decoy_ids:
                decoy_hits += 1

        metrics.decoy_attraction_score = decoy_hits / total_hits

    # 2. brittle_dependency_score: fraction of paths passing through a decoy
    total_paths = len(simulated_paths)
    if total_paths > 0:
        brittle_paths = 0
        all_nodes = sandbox_loader.get_all_nodes()
        decoy_ids = [n.get('decoy_id') for n in all_nodes if n.get('is_decoy')]

        for path in simulated_paths:
            path_has_decoy = any(node_id in decoy_ids for node_id in path)
            if path_has_decoy:
                brittle_paths += 1

        metrics.brittle_dependency_score = brittle_paths / total_paths

    # 3. early_warning_lead_time: synthetic approximation based on
    # the depth or order of decoy hits. For now, a simple placeholder.
    if metrics.decoy_attraction_score > 0:
        metrics.early_warning_lead_time = 24.5 # hours, synthetic

    return metrics
