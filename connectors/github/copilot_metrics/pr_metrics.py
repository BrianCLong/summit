"""GitHub Copilot Usage Metrics connector extensions for PR metrics."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

COPILOT_PR_METRICS_ENDPOINT = "/orgs/{org}/copilot/metrics"


class CopilotPrMetricsError(RuntimeError):
    """Raised when Copilot PR metrics cannot be fetched or normalized."""


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip():
        try:
            return float(value)
        except ValueError as exc:
            raise CopilotPrMetricsError(f"Invalid numeric metric value: {value!r}") from exc
    raise CopilotPrMetricsError(f"Unsupported metric value type: {type(value)!r}")


def normalize_copilot_pr_metrics(payload: Mapping[str, Any]) -> dict[str, float | None]:
    """Return deterministic PR metrics projected from a raw API payload."""
    metrics = payload.get("metrics", payload)
    if not isinstance(metrics, Mapping):
        raise CopilotPrMetricsError("Copilot usage metrics payload must contain an object at `metrics`.")

    normalized = {
        "pr_throughput": _to_float(metrics.get("pr_throughput")),
        "time_to_merge_hours": _to_float(metrics.get("time_to_merge_hours")),
    }
    return dict(sorted(normalized.items(), key=lambda item: item[0]))


def fetch_copilot_pr_metrics(client: Any, org: str) -> dict[str, float | None]:
    """Fetch PR throughput + time-to-merge from Copilot Usage Metrics API."""
    endpoint = COPILOT_PR_METRICS_ENDPOINT.format(org=org)
    try:
        response = client.get(endpoint)
    except Exception as exc:  # pragma: no cover
        raise CopilotPrMetricsError("Failed to call Copilot Usage Metrics API.") from exc

    if hasattr(response, "raise_for_status"):
        response.raise_for_status()
    if not hasattr(response, "json"):
        raise CopilotPrMetricsError("API client response must expose a json() method.")

    payload = response.json()
    if not isinstance(payload, Mapping):
        raise CopilotPrMetricsError("Copilot usage metrics response must be a JSON object.")
    return normalize_copilot_pr_metrics(payload)
