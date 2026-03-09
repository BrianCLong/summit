# scripts/qa_validation.py

from summit.core.agents.qa_agent import QAAgent
from summit.core.agents.extraction_agent import ExtractionAgent

def main():
    qa_agent = QAAgent()
    # TODO: load latest metrics
    qa_agent.run_validation(metrics={})
    qa_agent.monitor_drift()

if __name__ == "__main__":
    main()
