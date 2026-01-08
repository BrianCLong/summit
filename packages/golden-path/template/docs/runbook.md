# **SERVICE_NAME** Runbook

## On-call Quickstart

- Primary health: `/healthz`, readiness: `/readyz`, metrics: `/metrics`.
- Rollback: disable canary via config `CANARY_OVERRIDE=true` and redeploy latest stable tag.
- Alerts map to `configs/slo.yaml` burn rates.

## Debug Steps

1. Check dashboards for error rate, latency, saturation.
2. Inspect decision logs for authorization denials.
3. Review ingestion audit trail for residency or dedupe rejections.

## Compliance

- SBOM produced via `make sbom` stored in `artifacts/sbom.json`.
- Disclosure pack generated on release includes policy bundle version and deployment attestation.
