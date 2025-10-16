# Universal AI Fabric Runbook — Staging

## 1. Purpose

This runbook governs the Universal AI Fabric deployment for IntelGraph staging. It covers rollout, verification, steady-state operations, and rollback for the policy-driven router, adapters, cost guardrails, and provenance ledger delivered in this slice.

## 2. Contacts & On-Call

- **Service Owners:** Maestro Conductor build squad
- **Primary PagerDuty:** `intelgraph-ai-fabric-stg`
- **Escalation:** SRE duty manager → Platform governance lead

## 3. Change Windows

- Standard deploy window: Tue/Thu 16:00–18:00 UTC.
- Urgent patches require SRE + Governance approval with evidence bundle attached to the change ticket.

## 4. Pre-Deploy Checklist

1. `npm install && npm test` in `ga-graphai/packages/*` for modified packages.
2. Policy simulation: `npm test --workspace policy` (ensures license gates + cap math).
3. Load smoke: `k6 run packages/gateway/load/k6-plan.js` against staging gateway.
4. Verify Grafana dashboard "Universal AI Fabric – Staging" renders latency + cost panels.
5. Confirm Alertmanager silences are lifted post deploy.

## 5. Deployment Steps

1. `npm run build` (if bundling) or `docker compose build gateway` in staging pipeline.
2. Push container to registry tag `ai-fabric-stg-$DATE`.
3. Apply Helm chart overlay `universal-ai-fabric-stg`. Ensure OPA config map references `router.yaml`.
4. Run canary request: `curl -H 'x-tenant: acme-corp' -H 'x-purpose: investigation' -d '{"objective":"Smoke"}' https://gateway.stg/ v1/plan`.
5. Observe metrics for 5 minutes. If latency p95 ≤ 700ms and no policy denies spike → proceed.

## 6. Verification Gates

- GraphQL `plan` and `generate` endpoints return evidence IDs.
- `/metrics` exposes `ai_call_latency_ms`, `ai_tokens_total`, and `ai_policy_denies_total` with recent samples.
- Ledger `GET /evidence/:id` (future slice) returns recorded payload.
- Cost guardrail test: send paid-model request with zero cap → returns `CAP_DENY_PAID_MODEL`.

## 7. Rollback Procedure

1. Re-deploy prior container tag `ai-fabric-stg-<previous>` via Helm rollback.
2. Reapply previous router policy config map version.
3. Flush in-memory meters by restarting gateway pods (stateless).
4. Validate `/healthz` returns previous policy snapshot.

## 8. Operational Alarms

- **AICostSoftCapApproaching:** Investigate traffic spike, confirm downgrade to llama3 or mixtral. Consider increasing hard cap only with governance approval.
- **AIPolicyDeniesSpike:** Inspect ledger for repeated denial reason. If license drift, freeze offending dataset and notify compliance.
- **AILatencyBudgetBurn:** Check GPU utilisation. Optionally reroute to llama3 or queue heavy multimodal jobs.

## 9. Evidence & Reporting

- Every response is recorded in provenance ledger. Query latest 20 entries for incident reviews.
- Attach ledger record + Grafana snapshot to post-incident report within 24 hours.

## 10. Future Enhancements

- Wire /evidence/:id REST path for direct retrieval.
- Extend dashboard with cost burn-down per tenant.
- Add SBOM attestation to CI before deploy.
