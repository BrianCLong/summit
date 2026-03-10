# Runbook: Summit Architecture Map

## Overview
This runbook covers the operational readiness, alerts, and SLOs for the Summit Architecture Map blueprint integration.

## Alerts / Monitors
1. **Diagram Render Failure**: Mermaid diagram failed to render. Check syntax in `.mmd`.
2. **Missing Required Evidence IDs**: Artifacts missing the required `EVID-<MODULE>-<HASH>` format.
3. **Artifact Schema Drift**: `report.json` or `metrics.json` do not match the expected JSON schema.
4. **Interop-Matrix Drift**: Mismatch between declared interfaces and actual implementation paths.
5. **Policy Test Regression**: Failing tests in `tests/policy/`.

## SLOs / SLAs
- **Blueprint validation lane success rate**: $\ge$ 99%
- **Drift detector false positive rate**: Kept low enough for weekly review.
- **Render + Validate feedback**: Fast enough for normal PR use (< 1 minute).
