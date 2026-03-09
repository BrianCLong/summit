from summit.core.agents.extraction_agent import ExtractionAgent


def test_extract_metrics():
    agent = ExtractionAgent()
    metrics = agent.extract_metrics("Sample text")
    assert "evidence_id" in metrics
    assert "metric" in metrics
    assert "value" in metrics
