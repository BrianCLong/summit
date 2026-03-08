# summit/core/agents/extraction_agent.py

class ExtractionAgent:
    """
    Uses LLM to extract structured metrics from documents.
    """

    def __init__(self):
        # TODO: initialize LLM client
        pass

    def extract_metrics(self, document_text: str):
        """
        TODO:
        - Extract ESG, risk, sentiment, legal scores
        - Output deterministic JSON with evidence_id
        """
        return {"evidence_id": "mock_evidence_id", "metric": "mock_metric", "value": 1.0}

    def validate_schema(self, metrics: dict):
        """
        Ensure metrics match expected schema
        """
        pass
