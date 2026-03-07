class DocumentAgent:
    def __init__(self, source_path: str):
        self.source_path = source_path

    def ingest(self):
        print(f"Ingesting documents from {self.source_path}... TODO")

    def list_documents(self):
        return [{"document_id": "DOC001", "text": "Sample text 1"},
                {"document_id": "DOC002", "text": "Sample text 2"}]
