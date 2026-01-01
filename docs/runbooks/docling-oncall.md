# Docling Service On-Call Triage

## Dashboards

- Grafana: `Docling Overview` (latency, error rate, cost per tenant)
- Kibana: `docling-svc` index for structured logs (redacted)
- OpenTelemetry: Trace search `service.name=docling-svc`

## Common Alarms

1. **DoclingParseLatencyBreached**
   - Check Argo Rollout status for canary pods.
   - Inspect `/metrics` for increased histogram buckets.
   - If p95 > 900ms, enable circuit breaker: set `DOCILING_ENABLED=false` in feature flag service for affected tenant.
2. **DoclingErrorRateHigh**
   - Fetch last 20 error responses:
     ```bash
     kubectl logs deploy/docling-svc -n platform-ml | grep "status=502" | tail -n 20
     ```
   - Run policy simulation:
     ```bash
     npm run opa:test -- docling
     ```
3. **CostBudget80Percent**
   - Query `docling_cost_usd` metrics grouped by tenant.
   - Coordinate with TenantCostService to throttle or alert tenant owners.

## Escalation Matrix

- First responder: platform-ml on-call
- Secondary: compliance engineering (for license policy incidents)
- Security partner: security on-call (for retention policy breaches)

## Manual Fallback

If `docling-svc` unavailable:

1. Toggle feature flag `docling.enabled=false` in `maestro-config` for impacted tenants.
2. Enable baseline parsers via `npm run pipelines:baseline`.
3. Capture impacted request IDs and attach to incident ticket.

## Useful Commands

```bash
# Trigger golden dataset regression
npm run test -- docling:golden

# Query provenance ledger for last hour
psql $POSTGRES_URL -c "SELECT request_id, payload->>'usage' AS usage FROM provenance_ledger_v2 WHERE action_type LIKE 'docling%' AND timestamp > NOW() - INTERVAL '1 hour';"
```
