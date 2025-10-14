# Sprint F (2 weeks) — Tenant Flags, External Anchors, and Coverage Closure

**Theme**: Finish the *operationalization loop*: tenant-scoped enablement, external anchoring to a notary, 100% attestation coverage with lineage, dashboards/runbooks live, and customer-ready artifacts. This is the “flip the switch for more tenants” sprint.

## Objectives & KPIs
- **Tenant Flags**: per-tenant enablement of receipts/attestation + staged rollout ramps (0→10→50→100%).
  - *KPI*: Safe-guardrails: no tenant crosses error budget; feature toggles are instant (<1s) via config store.
- **External Anchors**: notary adapter (HTTPS) for second-source anchoring; soft-fail with queued retry.
  - *KPI*: ≥95% of anchors dual-published within 60s; external anchor p95 ≤ 250ms.
- **Coverage Closure**: 100% of write ops mapped to attestation; lineage `op_parent_id` links across API→worker chains.
  - *KPI*: coverage report = 100%; divergence detect rate = 0 on suite.
- **Dashboards + Alerts**: Golden dashboard JSON + alert rules checked-in; SLO monitors wired.
  - *KPI*: dashboards render with data; 3 critical alerts firing on induced faults.
- **Customer Readiness**: demo data + scripts; security appendix; SOC2-ready evidence pack skeleton.
  - *KPI*: demo completes in ≤8 min; evidence bundle exports in <30s.

---

## Work Breakdown (Stories)

### 1) Tenant Flags & Ramps
- [ ] **Config store**: add provider interface (env/JSON/Redis) + hot-reload watch.
- [ ] **Scope** receipts+attest by tenant and route/job; expose `X-Tenant-ID` plumbed through API/worker.
- [ ] **Ramp controller**: percentage- and cohort-based ramps; sticky by user/tenant.
- [ ] **Audit**: record feature decision in receipt context; include `tenant_id`, `flag_version`.

### 2) External Anchor Adapter
- [ ] **Adapter**: `HttpsNotarySink` with mTLS/token auth; exponential backoff; idempotent publish.
- [ ] **Format**: submit `{anchor_hash, batch_id, ts, kid}`; store provider receipt id in `proofs[]`.
- [ ] **Health gates**: if external down → internal anchors continue; queue external proofs for later.

### 3) Coverage & Lineage
- [ ] **Mapper completion**: add remaining routes/jobs to mapper catalog; generate coverage report.
- [ ] **Lineage IDs**: introduce `op_parent_id` and `op_chain_id` propagation (HTTP headers + job metadata); surface in audit.
- [ ] **Backfill**: run `integration/backfill_attest.py` over last N days; log skipped ops with reason.

### 4) Dashboards & Alerts
- [ ] **OTEL → Prom**: ensure metrics emitters in API/worker/ledger (queue depth, batch fill %, anchor lat, coverage %).
- [ ] **Dashboards**: JSON for *AuthZ & Receipts*, *Anchors & Queues*, *Attestation & Drift*.
- [ ] **Alerts**: rules for (a) anchor latency SLO breach, (b) queue depth > threshold, (c) divergence > 0, (d) coverage < 100%.

### 5) Customer Pack
- [ ] **Demo script**: seeded dataset; scripted flow to create records → anchor → audit UI.
- [ ] **Evidence exporter**: `/integration/evidence_bundle.py` builds zip with logs, anchors, policies, versions (SOC2/ISO hooks).
- [ ] **Security appendix**: selective disclosure, KMS/KID rotation process, privacy notes.

---

## Deliverables (PRs)

1. **PR8 — Tenant flags & ramps**: config provider, API/worker wiring, audit context, tests.
2. **PR9 — External anchor adapter**: HttpsNotarySink; config + retries; proofs persisted; tests + chaos.
3. **PR10 — Coverage & lineage**: mapper completion, coverage report, op lineage propagation; backfill tool runbook.
4. **PR11 — Dashboards & alerts**: dashboards JSON, alert rules, CI check to validate JSON schema.
5. **PR12 — Customer pack**: demo data/scripts, evidence exporter, docs.

---

## Tests & CI
- **Flags CI**: toggle on/off at runtime; assert middleware engaged/disengaged in <1s.
- **External notary CI**: mock notary service; induce 429/500; assert queued retry drains post-recovery.
- **Coverage CI**: run mapper coverage; fail if <100%.
- **Lineage CI**: generate chain of 3 ops; assert `op_chain_id` consistent; audit shows chain.
- **Dashboards CI**: lint dashboards; smoke metric names exist in emitted set.

---

## Implementation Notes
- **Config provider**: `providers/flags.py|ts` with `get_tenant_flag(tenant_id, flag)`; Redis JSON default with TTL.
- **Headers**: `X-Tenant-ID`, `X-Op-Id`, `X-Op-Parent-Id`, `X-Op-Chain-Id`.
- **Metrics**: counters/gauges/histograms: `ledger_anchor_latency_ms`, `anchor_batch_fill_ratio`, `attest_coverage_pct`, `attest_divergence_count`.
- **Proofs schema**: in `ReceiptV02`, add `{type: 'internal'|'external', id, url?, ts}`.

---

## Risks & Mitigations
- *Flag drift between services*: central provider + version in headers; log diffs.
- *External notary rate limits*: token bucket on client; jittered backoff; batch collapse.
- *Coverage blind spots*: enforce CI block + nightly report; code owners on mapper.

---

## Definition of Done
- Per-tenant flags functional; ramped to at least one additional tenant at 10%.
- Dual anchoring live with queued external proofs; KPIs green.
- Coverage report at 100% with lineage visible in audit UI.
- Dashboards/alerts merged and visible; demo + evidence exporter validated with a dry-run.
