import pytest

from connectors.github.copilot_metrics.client import CopilotMetricsClient
from connectors.github.copilot_metrics.config import CopilotMetricsConfig


def test_copilot_metrics_disabled_by_default():
    client = CopilotMetricsClient(CopilotMetricsConfig())
    with pytest.raises(RuntimeError, match="deny-by-default"):
        client.get_enterprise_report_links_for_day("enterprise", "2026-01-30")
