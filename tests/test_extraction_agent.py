from summit.core.agents.extraction_agent import ExtractionAgent


def test_extract_metrics():
    agent = ExtractionAgent()
    mock_text = "This is a test document."
    metrics = agent.extract_metrics(mock_text)
    assert "evidence_id" in metrics
    assert "metric" in metrics
    assert "value" in metrics
    agent.validate_schema(metrics)
