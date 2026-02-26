from typing import Dict, Any, List
from core.orchestrator.graph import OrchestratorGraph

class PolicyGate:
    def __init__(self, allowed_edges: List[Dict[str, str]] = None):
        # allowed_edges is a list of {"from": "agent_a", "to": "agent_b"}
        self.allowed_edges = allowed_edges or []

    def check_edge(self, from_agent: str, to_agent: str) -> bool:
        """Checks if data flow between two agents is allowed."""
        # Deny-by-default logic could be implemented here
        # For MWS, we'll check against allowed_edges if provided
        if not self.allowed_edges:
            # If no policy is defined, we might allow all for now or deny all.
            # User said "deny-by-default cross-agent tool execution".
            # Let's assume we need an explicit allowlist.
            return False

        for edge in self.allowed_edges:
            if edge["from"] == from_agent and edge["to"] == to_agent:
                return True
        return False

    def validate_graph(self, graph: OrchestratorGraph):
        """Validates all edges in the graph against the policy."""
        for edge in graph.edges:
            if not self.check_edge(edge["from"], edge["to"]):
                raise PermissionError(f"Policy Violation: Unapproved data flow from {edge['from']} to {edge['to']}")
