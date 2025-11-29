# Sprint Plan — Apr 6–17, 2026 (America/Denver)

> **Context:** Sprint 22 focused on enterprise-grade security, reliability, and scale. Anchor epics: SSO/SCIM + WebAuthn step-up, KMS envelope encryption with rotation, cross-region DR drills, graph snapshots/diffs, and Query Planner v2 with guardrails.

---

## 1) Sprint Goals (SMART)

Deliver **Identity hardening (SSO + SCIM + WebAuthn step-up)**, **KMS-backed envelope encryption with rotation**, **cross-region DR** (PITR, replication, drills), **graph snapshots & diff overlays**, and **Query Planner v2 with slow-query coach** to achieve by **Apr 17, 2026**:

- **Identity:** SSO login success ≥99.9%; SCIM drift ≤0.5% accounts; step-up enforced on 100% sensitive ops.
- **Crypto:** 100% new blobs under envelope encryption; rotation throughput ≥200 blobs/min sustained; zero decrypt failures.
- **Resilience:** RPO ≤15 min, RTO ≤30 min in drills; automated runbook passes.
- **Graph:** p95 diff time ≤2s (≤200k edges); precision ≥0.99, recall ≥0.98 on fixtures; snapshot creation ≤60s on demo graph.
- **Planner:** ≥30% reduction in p95 slow queries on dogfood projects; ≥70% of flagged queries get ≥1 accepted hint.

---

## 2) Success Metrics & Verification

- **SSO/SCIM/WebAuthn:**
  - SSO success ≥99.9%; JIT roles present in session (`workspaceId`, `roles[]`, `purpose`).
  - SCIM drift ≤0.5%; contract tests 100% green; disable in IdP blocks login ≤1 min.
  - Step-up enforced on export/retention/plugin installs; 2 keys/user; recovery documented.
  _Verify:_ Okta & Azure AD E2E, SCIM contract suite, audit logs, blocked export without step-up.
- **KMS & Rotation:**
  - 100% new blobs encrypted with active KEK; rewrap job ≥200 blobs/min; proofs logged per workspace.
  - No decrypt failures; scheduler pause/resume works; retries safe.
  _Verify:_ Unit/coverage report 100%; rotation drill runbook output; audit trail.
- **Cross-Region DR:**
  - PITR: nightly full + hourly incrementals; checksum chain valid; restore last 24h in dev.
  - Replication RPO ≤15 min; failover RTO ≤30 min with DNS switch; audit receipts.
  _Verify:_ Automated drill CLI receipts; integrity checks; health probes.
- **Graph Snapshots/Diff:**
  - Snapshot manifest immutable; creation ≤60s demo graph.
  - Diff ≤2s for ≤200k edges; explain-why changed shows lineage.
  _Verify:_ Fixture benchmarks; UI overlay counts/legend; report export.
- **Query Planner v2:**
  - Cardinality estimator p50 error <2×; hints visible pre-execution.
  - Slow-query coach suggests ≥1 actionable hint for 90% flagged queries.
  _Verify:_ Planner fixtures; UI hint telemetry; coach acceptance logs.

---

## 3) Scope

**Must-have (commit):**

- **A — Identity (SSO/SCIM/WebAuthn):** OIDC/SAML SP-initiated login with role/claims mapping and JIT creation; SCIM 2.0 Users/Groups with soft deletes and drift report; WebAuthn registration/auth + step-up gating sensitive mutations.
- **B — KMS & Rotation:** Envelope encryption (per-blob DEK wrapped by workspace KEK in KMS); rotation scheduler with pause/resume, rate limits, proofs; secrets hygiene scanner + rotation CLI.
- **C — Cross-Region DR:** PITR backups (full + hourly incremental) for graph/pg/redis metadata; object storage replication with versioning/delete-marker protection; failover runbook + automated drill with health checks and DNS swap.
- **D — Graph Snapshots & Diff:** Snapshot API `{snapshotId, atTime, filters}` with immutable manifest; diff engine for node/edge add/remove/prop changes with lineage explain; UI tri-pane overlay with legend, counts, export.
- **E — Query Planner v2:** Cardinality estimator with stats + row/cost hints; bound expansion caps + index advisor; slow-query coach with actionable guidance and sampling fallback; chaos tests + SLO dashboard for p95/p99.

**Stretch:**

- SCIM drift report UI; rotation progress meter in admin console; snapshot TTL policies with cold storage hooks; “mute hint” per query signature.

**Out-of-scope:**

- Cross-tenant playbooks; destructive automation default-on; non-FIPS HSM evaluation.

---

## 4) Team & Capacity

- 10 business days; focus factor 0.8 → commit **40 pts** (≈50 nominal) with ~10% buffer.
- Identity/KMS reliability pod leads incident guardrails; DR + graph pod owns drills/benchmarks; planner pod co-owns chaos tests with SRE.

---

## 5) Backlog (Ready for Sprint)

### Epic A — Identity: SSO, SCIM, WebAuthn — **12 pts**

- **A1 — OIDC/SAML SSO** (4 pts) — SP-initiated login; Okta/Azure AD mappings; session carries workspace/roles/purpose.
- **A2 — SCIM 2.0 Users/Groups** (5 pts) — `/scim/v2/Users` & `/Groups`; idempotent PATCH; soft deletes; drift report; 100% contract tests.
- **A3 — WebAuthn Step-Up** (3 pts) — register/auth keys; enforce on export/retention/plugin install; 2 keys/user; recovery flow docs.

### Epic B — KMS & Rotation — **10 pts**

- **B1 — Envelope Encryption** (4 pts) — per-blob DEK wrapped by workspace KEK; KEK in KMS; old KEKs retained until rewrap.
- **B2 — Rotation Scheduler** (4 pts) — scheduled KEK rotation + DEK rewrap; pause/resume; rate limits; audit proofs; safe retries.
- **B3 — Secrets Hygiene** (2 pts) — rotation CLI for API tokens/webhooks; scanner failing CI on hard-coded secrets.

### Epic C — Cross-Region DR — **8 pts**

- **C1 — PITR Backups** (3 pts) — nightly full + hourly incremental; integrity checks; restore last 24h.
- **C2 — Object Replication** (3 pts) — blob replication with versioning/delete markers protected; RPO ≤15 min.
- **C3 — Failover Runbook & Automation** (2 pts) — one-click promote + DNS swap; health checks; audit receipts.

### Epic D — Graph Snapshots & Diff — **6 pts**

- **D1 — Snapshot API** (2 pts) — consistent graph view with filters; manifest immutable; creation ≤60s demo graph.
- **D2 — Diff Engine** (3 pts) — node/edge add/remove/prop change with lineage explain; ≤2s for ≤200k edges; precision ≥0.99.
- **D3 — UI Overlay** (1 pt) — tri-pane overlay highlighting adds/removes/changed; legend + counts; export summary.

### Epic E — Query Planner v2 & Guardrails — **6 pts**

- **E1 — Cardinality Estimator** (2 pts) — stats collection; row/cost hints pre-exec; p50 error <2× fixtures.
- **E2 — Bound Expansion & Index Advisor** (2 pts) — cap traversals; sampled fallback; index advisories; slow-query coach actionable ≥90% of flagged queries.
- **E3 — Chaos & SLOs** (2 pts) — failure injection on driver timeouts; p95/p99 SLO dashboard; alerts wired.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- IdP integrations (Okta, Azure AD) available; metadata for SAML/OIDC provided; IdP admin for SCIM enablement.
- KMS access and quotas approved; no new FIPS module requirements this sprint; object store versioning enabled.
- Staging supports cross-region drill with DNS sandbox; read-only mode allowed during cutover; audit sink reachable.
- Graph fixtures up to 200k edges ready for diff benchmarks; planner telemetry enabled; chaos env parity with staging.

---

## 7) Timeline & Ceremonies (MT)

- **Mon 4/6:** Kickoff; confirm IdP metadata; enable chaos toggle; baseline metrics.
- **Tue 4/7:** Identity E2E happy path; KMS envelope wiring merged; PITR pipeline smoke.
- **Wed 4/8:** SCIM contract suite green; snapshot API demo; rotation scheduler dry-run.
- **Thu 4/9:** Diff engine perf pass; planner v2 hints in UI; DR replication lag charts.
- **Fri 4/10:** WebAuthn step-up gating sensitive ops; rotation proofs logging; drill rehearsal.
- **Mon 4/13:** Automated failover drill (RPO/RTO); coach acceptance telemetry; chaos run.
- **Wed 4/15:** Hardening buffer; stretch items; docs complete; recovery playbook sign-off.
- **Fri 4/17:** Demo + acceptance, audit export, retro; release candidates tagged.

---

## 8) Risks & Mitigations

- **IdP drift / SCIM storms:** backoff + etags; idempotent PATCH; drift report preview before deletes.
- **Key rotation performance:** batch rewrap with rate limits; resumable checkpoints; alert on lag.
- **DR complexity:** automate runbook; rehearse in staging; read-only during cutover; guard against split brain.
- **Snapshot bloat:** TTL + cold storage path; manifests immutable; export counts to monitor size.
- **Coach false positives:** keep advisory; allow mute per query signature; sample-based fallback.

---

## 9) Demo & Acceptance Checklist

1. **SSO/SCIM:** Okta login succeeds; SCIM pushes new analyst → appears with mapped roles; disabling in IdP blocks login ≤1 min.
2. **WebAuthn Step-Up:** Export attempt prompts step-up; security key auth succeeds; without step-up → blocked.
3. **Key Rotation:** Rotate workspace KEK; rewrap job completes 100%; proofs + counts logged; no failures.
4. **DR Drill:** Automated failover to secondary completes; app healthy; RPO ≤15 min, RTO ≤30 min; receipts captured.
5. **Snapshots & Diff:** Create snapshots pre/post ingest; diff overlay highlights adds/removes/changes; export summary report.
6. **Query Coach:** Slow query flagged; coach suggests index/bound; after applying, p95 latency drops; hints logged.

---

## 10) Open Questions

1. Which IdPs must be certified first (Okta, Azure AD, Ping)?
2. Target RPO/RTO beyond demo numbers (hard SLAs)?
3. Snapshot retention defaults (count/age) and who approves forced deletions?
4. Any regulated datasets requiring FIPS-validated crypto modules this sprint?

