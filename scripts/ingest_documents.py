import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from summit.core.agents.document_agent import DocumentAgent


def main():
    agent = DocumentAgent(source_path="data/raw")
    agent.ingest()

if __name__ == "__main__":
    main()
