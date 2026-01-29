# Data Handling: Azure Turin v7 Subsumption Bundle

## Data Classification
- **Public:** Documentation, Manifests, Schemas.
- **Internal:** Benchmark metrics, Drift reports, Evidence artifacts.
- **Confidential:** None (this bundle contains no secrets or PII).

## Retention Policy
Evidence artifacts (`report.json`, `metrics.json`, `stamp.json`) are retained according to the global Governance Evidence Policy (default: perpetual for regulatory gates, 90 days for operational metrics).

## PII & Secrets
- **PII:** This bundle must NOT process PII.
- **Secrets:** This bundle must NOT contain secrets. All pricing or API integrations must use the centralized Secret Manager if added in the future.
