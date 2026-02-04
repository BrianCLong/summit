import networkx as nx
from .digital_mind import DigitalMind

class Simulation:
    """Manages the cognitive simulation environment."""

    def __init__(self):
        """Initializes a new Simulation."""
        self.population = nx.Graph()
        self.tick_count = 0

    def add_mind(self, digital_mind):
        """
        Adds a DigitalMind to the simulation.

        Args:
            digital_mind: The DigitalMind to add.
        """
        self.population.add_node(digital_mind.id, mind=digital_mind)

    def connect_minds(self, mind1, mind2):
        """
        Connects two DigitalMinds in the simulation.

        Args:
            mind1: The first DigitalMind.
            mind2: The second DigitalMind.
        """
        self.population.add_edge(mind1.id, mind2.id)

    def tick(self):
        """Advances the simulation by one step."""
        self.tick_count += 1
        print(f"--- Simulation Tick {self.tick_count} ---")
        # In the future, this is where belief propagation logic will go.
        for mind_id in self.population.nodes:
            mind = self.population.nodes[mind_id]['mind']
            # Example logic: interact with connected minds
            neighbors = self.population.neighbors(mind_id)
            # print(f"{mind} is connected to {len(list(neighbors))} minds.")


    def __repr__(self):
        return f"Simulation(population_size={self.population.number_of_nodes()})"
