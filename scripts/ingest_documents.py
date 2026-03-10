# scripts/ingest_documents.py

from summit.core.agents.document_agent import DocumentAgent


def main():
    agent = DocumentAgent(source_path="data/raw")
    agent.ingest()
    print("Document ingestion complete.")

if __name__ == "__main__":
    main()
