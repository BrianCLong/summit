from summit.core.agents.qa_agent import QAAgent

def test_validation_and_drift():
    agent = QAAgent()
    mock_metrics = {"metric": "Sample", "value": 0.5}
    agent.run_validation(mock_metrics)
    agent.monitor_drift()  # should run without errors
