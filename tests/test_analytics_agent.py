from summit.core.agents.analytics_agent import AnalyticsAgent

def test_compute_trends():
    agent = AnalyticsAgent()
    # just testing that it doesn't crash for now
    agent.compute_trends([])
