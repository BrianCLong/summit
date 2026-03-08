# scripts/analytics_pipeline.py

from summit.core.agents.analytics_agent import AnalyticsAgent
from summit.core.agents.extraction_agent import ExtractionAgent


def main():
    analytics_agent = AnalyticsAgent()
    # TODO: load metrics from evidence/text_intelligence_metrics.json
    analytics_agent.compute_trends(metrics_list=[])
    analytics_agent.generate_dashboard()

if __name__ == "__main__":
    main()
