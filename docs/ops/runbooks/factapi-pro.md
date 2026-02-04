# FactAPI Pro Runbook

## Overview
Operational guide for FactAPI Pro.

## Procedures

### Key Rotation
1.  **Generate new key**: Use secure random generator (e.g. `openssl rand -hex 32`).
2.  **Update Config**: Add new key to `FACTAPI_PRO_VALID_KEYS` env var.
3.  **Redeploy**: Deploy new config.
4.  **Rotate**: Inform client to switch.
5.  **Revoke**: Remove old key from env var.

### Incident: Elevated 429s
**Symptoms**: Spike in `http_requests_total{status="429"}`.
**Diagnosis**:
1.  Check `metrics.json` or logs for tenant ID.
2.  If single tenant: They are hitting quota or concurrency limit. Contact tenant.
3.  If global: System might be under DDoS or misconfigured global limit.

### Incident: Webhook Signature Failures
**Symptoms**: Spike in 401s on `/v1/webhooks/inbound`.
**Diagnosis**:
1.  Check if `SECRET` is consistent.
2.  Check if partner is using correct algorithm (HMAC-SHA256).
3.  Check `X-Timestamp` drift (replay protection).

### Incident: Billing Mismatch
**Diagnosis**:
1.  Compare `metrics.json` usage vs Invoice.
2.  Verify determinism of `metrics.json` generation.
