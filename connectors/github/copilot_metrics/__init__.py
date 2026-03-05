"""GitHub Copilot metrics connector package."""

from .client import CopilotMetricsClient
from .config import CopilotMetricsConfig
from .redaction import strip_signed_urls
from .pr_metrics import fetch_copilot_pr_metrics, normalize_copilot_pr_metrics

__all__ = [
    "CopilotMetricsClient",
    "CopilotMetricsConfig",
    "strip_signed_urls",
    "fetch_copilot_pr_metrics",
    "normalize_copilot_pr_metrics",
]
