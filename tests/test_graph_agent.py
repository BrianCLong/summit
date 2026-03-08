from summit.core.agents.graph_agent import GraphAgent


def test_add_and_query_graph():
    agent = GraphAgent()
    agent.add_entities(["Entity1", "Entity2"])
    results = agent.query_graph("Entity1")
    assert isinstance(results, list)
