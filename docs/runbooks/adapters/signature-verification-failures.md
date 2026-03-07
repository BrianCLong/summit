# Adapter Signature Verification Failures

Use this runbook when adapters start rejecting messages due to signature or envelope validation errors.

## Detection

- Alerts: `AdapterRepeatedFailures` if verification errors manifest as 4xx/5xx responses; review `observability/dashboards/adapters/error-rate.json`.
- Logs: adapter service logs with `signature invalid`, `untrusted issuer`, or `timestamp outside window`.
- Metrics: spikes in `adapter_retry_outcomes_total{outcome="failed"}` paired with 4xx codes.

## Triage Checklist

- Identify which adapter(s) and tenants are affected using metric labels (adapter, tenant, issuer).
- Confirm current trust bundle: compare configured JWKS/certificates against the control repo or secret store.
- Check time skew on adapter nodes (`chronyc tracking`) because large skew invalidates timestamps.
- Validate that recent key rotations were deployed everywhere (webhooks, ingest gateway, adapter pods).

## Remediation Steps

1. **Contain the blast radius**: if only one issuer is failing, temporarily disable that route or increase backoff to protect other traffic.
2. **Refresh trust material**:
   - Pull the expected JWKS/certs from the authority of record and compare fingerprints.
   - Rotate secrets/config maps and restart the adapter deployment.
3. **Validate signing clock**: adjust NTP or restart time-sync if skew exceeds policy limits.
4. **Reprocess impacted messages**:
   - For queued items, re-sign payloads if possible; otherwise re-enqueue via DLQ replay once trust is restored.
   - Monitor `adapter_retry_outcomes_total{outcome="success"}` and error rate until stable.

## Verification

- Error rate for the adapter returns to baseline and `AdapterRepeatedFailures` clears.
- Successful retries increase while failed retries trend to zero.
- No new signature validation errors appear in logs for at least 30 minutes.

## Escalation

- If signatures remain invalid after rotation, escalate to Security with evidence: failing payload IDs, issuer, kid, and certificate chain.
- File a post-incident report and add regression tests that validate signature verification paths for the affected adapter routes.
