import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from summit.core.agents.document_agent import DocumentAgent
from summit.core.agents.extraction_agent import ExtractionAgent


def main():
    doc_agent = DocumentAgent("data/raw")
    extraction_agent = ExtractionAgent()
    for doc in doc_agent.list_documents():
        metrics = extraction_agent.extract_metrics(doc["text"])
        extraction_agent.validate_schema(metrics)

if __name__ == "__main__":
    main()
