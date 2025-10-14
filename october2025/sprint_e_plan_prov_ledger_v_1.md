# Sprint E (2 weeks) — Prov‑Ledger v1.1, Full Attestation, and Customer Canary

**Theme**: Turn receipts+ledger from “wired” to **operationally robust** and **customer‑ready** with end‑to‑end attestation, external anchoring, performance budgets, and rollout tooling.

## Objectives & KPIs
- **Prov‑Ledger v1.1**: external anchor endpoint + selective disclosure policies.
  - *KPI*: anchor commit p95 ≤ **12ms** (local), ≤ **30ms** (edge); batch efficiency ≥ **0.85** (avg receipts/anchor).
- **Full Attestation**: 100% write ops emit dual‑digests with op_id lineage; backfill utility.
  - *KPI*: divergence detect rate **= 0** on suite; coverage report **100%**.
- **Crypto & Keys**: KMS integration (sign & rotate) + FIPS‑ok primitives option.
  - *KPI*: key rotation < **2s** downtime; KID propagation visible in 100% traces.
- **Rollout/Canary**: 1 pilot tenant on receipts+attestation with dashboards and runbooks.
  - *KPI*: no SLO regressions; < **0.1%** added error rate; support ticket count **0** for feature.

---

## Work Breakdown (Stories)

### 1) Prov‑Ledger v1.1
- [ ] **Anchoring providers**: add pluggable `AnchorSink` (in‑process Merkle + optional external anchor adapter). Implement `file://` and `https://notary` adapters.
- [ ] **Selective disclosure**: field allowlist/denylist + per‑tenant redaction salts; API: `POST /anchor/policy`.
- [ ] **Backpressure**: adaptive batcher (target size vs latency). Expose metrics: queue depth, batch fill ratio, commit latency.
- [ ] **Schema/token**: versioned receipt schema `v0.2` with `proofs[]` (internal/external anchors) + `fields_mask`.

### 2) Dual‑Graph Attestation 100%
- [ ] **Mapper catalog**: declarative map from route/job → (PG rows extractor, Neo subgraph extractor).
- [ ] **Backfill tool**: `integration/backfill_attest.py` to compute digests for historical ops.
- [ ] **Drift alarms**: thresholded alerts when PG≠Neo digests; auto‑rollback switch for write path.

### 3) Crypto/KMS & FIPS Track
- [ ] **KMS adapter** interface (sign, get_kid) + local dev shim. Env‑driven selection.
- [ ] **FIPS mode** flag; swap primitives accordingly; self‑test on boot.
- [ ] **Key rotation ceremony**: CLI `keys/rotate --kid new` updates env/secret and soft‑reloads services.

### 4) Canary & Ops
- [ ] **Dashboards** (OTEL/metrics): authz p95, anchor p95, queue depth, batch fill, divergence rate, coverage %.
- [ ] **Runbooks**: ledger outage, anchor provider outage, KMS rotate, selective disclosure audit.
- [ ] **Feature flags**: tenant‑scoped enablement; per‑route scope.

### 5) Eval/Assurance Extensions
- [ ] **GraphAI‑SAFETY‑v0.1**: add traversal‑exfil + entity‑conflation variants; budget gates.
- [ ] **Load gen**: concurrency sweeps (rps 50→1k) with rate control; publish latency curves.

---

## Deliverables (PRs)

1. **PR4 — ledger v1.1**
   - New `AnchorSink` interface; adapters; adaptive batcher; metrics; schema v0.2.
   - Migrations + compatibility shim (v0.1 receipts readable).
2. **PR5 — attestation coverage + backfill**
   - Mapper catalog; decorators; backfill tool; drift alerts + rollback guard.
3. **PR6 — KMS + FIPS mode**
   - KMS provider + config; FIPS toggle; rotation CLI; docs.
4. **PR7 — canary + dashboards + runbooks**
   - Tenant flags & configs; OTEL dashboards JSON; SLO runbooks; release notes.

Each PR includes: tests, CI jobs, dashboards (where relevant), and docs.

---

## Tests & CI
- **Latency CI**: anchored under mixed loads (p50/p95/p99) with regression thresholds.
- **Resilience CI**: kill anchor provider mid‑batch, assert retry/flush and no API 5xx.
- **Attestation CI**: synthetic ops; induced PG/Neo mismatch → alert + auto‑rollback triggers.
- **KMS CI**: mock KMS; rotation mid‑traffic; verify KID change in traces without failures.

---

## Implementation Notes
- Interfaces (`/impl/ledger-svc`): `AnchorSink`, `AnchorPolicy`, `BatcherConfig`; versioned `ReceiptV02`.
- API/Worker: use mapper catalog; emit `op_parent_id` to chain ops; OTEL link spans across services.
- Data Privacy: selective disclosure masks at emit time; audit rehydration requires scoped token.

---

## Risks & Mitigations
- **External anchor latency spikes** → adaptive batch + fallback to internal‑only with queued external.
- **KMS throttling** → local cache of signing tokens; rate limiter.
- **Selective disclosure misconfig** → policy dry‑run mode, audit diff tool.

---

## Definition of Done
- Ledger v1.1 deployed; schema v0.2 live; compatibility verified.
- Coverage report shows 100% write‑op attestation.
- Canary tenant live for ≥48h with SLOs green; dashboards populated.
- CI matrix green; docs/runbooks merged; feature flags togglable per tenant.

