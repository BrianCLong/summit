class ExtractionAgent:
    def __init__(self):
        pass

    def extract_metrics(self, document_text: str):
        return {"evidence_id": "TI-PLACEHOLDER", "metric": "Sample_metric", "value": 0.5}

    def validate_schema(self, metrics: dict):
        print("Validating schema... TODO")
