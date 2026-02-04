import networkx as nx

class BeliefNetwork:
    """Represents the network of beliefs for a DigitalMind."""

    def __init__(self):
        """Initializes a new BeliefNetwork."""
        self.graph = nx.DiGraph()

    def add_belief(self, belief, strength=1.0):
        """
        Adds a belief to the network.

        Args:
            belief: The belief to add (e.g., a string).
            strength: The initial strength of the belief.
        """
        self.graph.add_node(belief, strength=strength)

    def add_connection(self, from_belief, to_belief, weight=1.0):
        """
        Adds a connection between two beliefs.

        Args:
            from_belief: The source belief.
            to_belief: The target belief.
            weight: The weight of the connection.
        """
        self.graph.add_edge(from_belief, to_belief, weight=weight)

    def __repr__(self):
        return f"BeliefNetwork(beliefs={self.graph.number_of_nodes()})"
