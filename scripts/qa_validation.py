import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from summit.core.agents.qa_agent import QAAgent

def main():
    qa_agent = QAAgent()
    qa_agent.run_validation(metrics={})  # TODO: load metrics
    qa_agent.monitor_drift()

if __name__ == "__main__":
    main()
