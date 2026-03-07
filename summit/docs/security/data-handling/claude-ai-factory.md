# Data Classification & Handling for AI Factory

## Classification
- **Issue text**: Internal engineering content.
- **CI logs**: Internal operational telemetry.
- **Patches**: Source code / confidential repo content.
- **Evidence artifacts**: Internal audit data.

## Retention Policy
- **Report & Metrics (`report.json`, `metrics.json`, `evidence.json`)**: 30 days in CI artifacts.
- **Release Readiness (`release-readiness.json`)**: 90 days.
- **Failed Self-Heal Logs**: 14 days.
- **Trend Aggregates**: 180 days.

## Never Log Policy
- Secrets or env var values.
- Provider tokens.
- Raw dependency credentials.
- Private URLs with embedded auth.
- Full proprietary issue bodies in public issues.
- Raw PR review comments containing sensitive fragments.

## Redaction Policy
- Hash issue body in deterministic artifacts.
- Store only snippet IDs and claim IDs in evidence files.
- Put volatile operational detail in `stamp.json`, not `report.json`.
