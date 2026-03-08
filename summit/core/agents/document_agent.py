# summit/core/agents/document_agent.py

class DocumentAgent:
    """
    Ingests documents, parses them, and stores in vector DB.
    """

    def __init__(self, source_path: str):
        self.source_path = source_path
        # TODO: initialize vector store / embeddings client

    def ingest(self):
        """
        TODO:
        - Load PDFs, reports, emails
        - Clean and normalize text
        - Store embeddings in vector store
        """
        pass

    def list_documents(self):
        """
        Return list of ingested documents with metadata
        """
        return [{"document_id": "mock_id", "text": "mock_text"}]
