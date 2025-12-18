import uuid

class DigitalMind:
    """Represents a single agent in the cognitive simulation."""

    def __init__(self, belief_network):
        """
        Initializes a new DigitalMind.

        Args:
            belief_network: An instance of the BeliefNetwork class.
        """
        self.id = uuid.uuid4()
        self.belief_network = belief_network
        self.connections = []

    def add_connection(self, other_mind):
        """
        Establishes a connection to another DigitalMind.

        Args:
            other_mind: The DigitalMind to connect to.
        """
        if other_mind not in self.connections:
            self.connections.append(other_mind)

    def __repr__(self):
        return f"DigitalMind(id={self.id})"
