import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from summit.core.agents.analytics_agent import AnalyticsAgent

def main():
    analytics_agent = AnalyticsAgent()
    analytics_agent.compute_trends(metrics_list=[])  # TODO: load metrics
    analytics_agent.generate_dashboard()

if __name__ == "__main__":
    main()
