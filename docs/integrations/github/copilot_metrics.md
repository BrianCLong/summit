# GitHub Copilot Metrics (GHEC, Data Residency Preview)

## Overview

Summit integrates with GitHub Copilot usage metrics for GitHub Enterprise Cloud (GHEC), including
enterprise dashboards, code generation dashboards, and REST API access for usage metrics. Metrics
are sourced from IDE telemetry and are limited to the Copilot surfaces covered by telemetry
collection. Summit treats GitHub as the canonical source of Copilot adoption reporting and
normalizes the data into internal evidence bundles.

## Access Control

GitHub provides a fine-grained enterprise permission called **"View enterprise Copilot metrics"**.
Summit mirrors this least-privilege approach: only users granted the equivalent Summit role can view
Copilot metrics evidence and dashboards.

## Telemetry-Only Caveat

Copilot usage metrics are derived from IDE telemetry only; Copilot Chat usage on GitHub.com, Mobile,
CLI, and other surfaces is excluded unless explicitly part of telemetry coverage. Telemetry must be
enabled in the enterprise/org settings for metrics to populate.

## Data Residency and Migration Split Caveat

When an enterprise migrates to data residency, GitHub may split historical metrics across enterprise
accounts. Multi-account IDE attribution also maps to the data-residency enterprise account. Summit
records residency context on every evidence bundle and flags potential trend breaks to prevent
mixed-baseline interpretations.

## Legacy API Sunsets

GitHub is sunsetting legacy Copilot metrics APIs in March and April 2026. Summit does **not**
integrate legacy endpoints and relies on the newer "Copilot usage metrics" API family.

## Configuration

The connector is **deny-by-default**. Enable it explicitly per enterprise:

```python
from connectors.github.copilot_metrics.config import CopilotMetricsConfig

cfg = CopilotMetricsConfig(
    enabled=True,
    api_base_url="https://api.github.com",  # or dedicated GHEC base URL
    api_version="2022-11-28",
    residency_enabled=True,
    residency_region="unknown",
)
```

## Security Notes

- Tokens must be stored in secrets management and are never written to disk.
- Signed report download links are treated as secrets and must never be persisted.
- Evidence bundles must include residency tags for auditability.
