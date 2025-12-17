from summit_cog_war.cognition_legions.simulation import Simulation
from summit_cog_war.cognition_legions.digital_mind import DigitalMind
from summit_cog_war.cognition_legions.belief_network import BeliefNetwork

def run_basic_scenario():
    """Runs a basic simulation scenario."""
    print("Initializing basic scenario...")
    sim = Simulation()

    # Create a small population of DigitalMinds
    minds = [DigitalMind(BeliefNetwork()) for _ in range(10)]
    for mind in minds:
        sim.add_mind(mind)

    # Connect the minds in a simple network
    for i in range(len(minds) - 1):
        sim.connect_minds(minds[i], minds[i+1])

    print(f"Scenario initialized: {sim}")

    # Run the simulation for a few ticks
    for _ in range(5):
        sim.tick()

if __name__ == "__main__":
    run_basic_scenario()
