from typing import Dict, List, Set, Any

class OrchestratorGraph:
    def __init__(self):
        self.nodes: Dict[str, Any] = {}
        self.edges: List[Dict[str, str]] = []

    def add_agent(self, name: str, **kwargs):
        self.nodes[name] = kwargs

    def add_edge(self, from_agent: str, to_agent: str):
        if from_agent not in self.nodes or to_agent not in self.nodes:
            raise ValueError("Agents must be added before creating edges")
        self.edges.append({"from": from_agent, "to": to_agent})

    def is_acyclic(self) -> bool:
        visited = set()
        rec_stack = set()

        adj = {name: [] for name in self.nodes}
        for edge in self.edges:
            adj[edge["from"]].append(edge["to"])

        def has_cycle(v):
            visited.add(v)
            rec_stack.add(v)

            for neighbour in adj[v]:
                if neighbour not in visited:
                    if has_cycle(neighbour):
                        return True
                elif neighbour in rec_stack:
                    return True

            rec_stack.remove(v)
            return False

        for node in self.nodes:
            if node not in visited:
                if has_cycle(node):
                    return False
        return True

    def get_execution_order(self) -> List[str]:
        if not self.is_acyclic():
            raise ValueError("Graph contains cycles; cannot determine execution order.")

        visited = set()
        stack = []

        adj = {name: [] for name in self.nodes}
        for edge in self.edges:
            adj[edge["from"]].append(edge["to"])

        def topological_sort_util(v):
            visited.add(v)
            for i in adj[v]:
                if i not in visited:
                    topological_sort_util(i)
            stack.insert(0, v)

        for i in self.nodes:
            if i not in visited:
                topological_sort_util(i)

        return stack
