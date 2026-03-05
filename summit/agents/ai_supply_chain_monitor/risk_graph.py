class RiskGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_node(self, node_id, node_type):
        """Add a node representing a package, repository, AI model, or developer project."""
        self.nodes[node_id] = {"type": node_type}

    def add_edge(self, source_id, target_id, relation_type):
        """Add an edge like recommended_by, installed_by, referenced_in_code."""
        self.edges.append({
            "source": source_id,
            "target": target_id,
            "relation": relation_type
        })

    def get_in_degree(self, node_id, relation_type=None):
        count = 0
        for edge in self.edges:
            if edge["target"] == node_id:
                if relation_type is None or edge["relation"] == relation_type:
                    count += 1
        return count
