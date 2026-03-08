# Runbook: MOSAIC-Style Threat Model

## Operations
1. Toggle feature flag via `SUMMIT_THREAT_ASSESSMENT_ENABLED`.
2. Validate artifact schema generation.
3. Run drift monitor and inspect trend metrics.
4. On redaction violation, disable feature and rotate affected logs/artifacts.

## Alerts
- Scoring failure rate > 1%
- Artifact schema violations > 0
- p95 latency above budget
- Redaction failures > 0
