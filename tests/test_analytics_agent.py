from summit.core.agents.analytics_agent import AnalyticsAgent


def test_compute_trends_and_dashboard():
    agent = AnalyticsAgent()
    mock_metrics = [{"metric": "Sample", "value": 0.5}]
    agent.compute_trends(mock_metrics)
    agent.generate_dashboard()  # should not raise errors
