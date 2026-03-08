# scripts/monitoring/text_intelligence_drift.py

from summit.core.agents.qa_agent import QAAgent


def main():
    qa_agent = QAAgent()
    qa_agent.monitor_drift()
    print("Drift monitoring complete.")

if __name__ == "__main__":
    main()
