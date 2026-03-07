# MASTER ORCHESTRATION PROMPT — MVP-3 → GA

Here’s a single, production-ready **multi-agent release prompt** you can paste into your orchestration system. It wires together all 23 epics into one coordinated plan to drive **MVP-3 → GA** with safe, reversible changes, evidence, and policy gates.

---

> Paste verbatim into your multi-agent system. Replace `{{…}}` placeholders. All agents must emit **structured logs**, **OTEL spans**, and **verifiable artifacts**. Promotion is **policy-gated**; rollbacks are **hands-free**.

## Mission

Deliver MVP-3 as **General Availability** with **progressive delivery**, **hard SLO/SBOM/migration gates**, **auditable evidence**, and **instant rollback**. Environments: **dev → stage → prod** with **PR previews**.

## Global constraints (apply to every agent)

- Golden path SLOs enforced; canary auto-rollback on breach.
- IaC only (Helm + Terraform). No plaintext secrets; SOPS + Sealed-Secrets.
- Images **signed**, **attested** (SLSA), SBOMs required; diff budgets enforced.
- AuthZ via OPA (RBAC+ABAC), step-up auth + Reason-for-Access on elevated actions.
- Immutable audit trail; artifacts retained ≥ 1 year.
- Every change has **rollback steps** and **owner**; follow CODEOWNERS.

## Inputs (required)

- Repo: `{{REPO_NAME}}` (default: `summit-2025.09.23.1710`)
- Target release: `{{TARGET_VERSION}}` (e.g., `v3.0.0`)
- Change window & contacts: `{{WINDOW}}`, `{{ONCALL_HANDLES}}`
- Tenants for probes/tests: `{{TEST_TENANTS}}`
- Budget guardrails: `{{DAILY_PREVIEW_BUDGET_USD}}`, `{{MAX_IMAGE_MB}}`
- IdP & SCIM endpoints (if enabled): `{{OIDC_ISSUER}}`, `{{SCIM_BASEURL}}`

## Required outputs (succinct & machine-parsable)

- `artifacts/release/{{TARGET_VERSION}}/evidence.zip` (signed)
- `release_notes/{{TARGET_VERSION}}.md`
- Green dashboards: SLOs, perf, security, DR freshness
- GA toggle: `featureFlags.search.ga.enabled=true` (and other GA flags) set with audit trail
- Post-release KPI report + regression issues (if any)

---

## Orchestration protocol

- **Conductor** coordinates phases and verifies gates. Subagents work in parallel where safe.
- Every agent replies with:

  ```
  { "phase":"<P#>", "agent":"<name>", "action":"<what>", "result":"ok|fail", "evidence":[...], "trace_id":"..." }
  ```

- On **fail**, Conductor triggers the relevant **rollback playbook**, posts evidence, and re-queues after fix or halts with incident.

---

## Phases (top-level)

1. **P0 — Readiness Sweep** (Epics 03, 12, 05, 04)
2. **P1 — Gates On + Previews/Perf Baselines** (Epics 01, 06, 07, 11)
3. **P2 — Data Safety** (Epics 02, 10, 15)
4. **P3 — Security/Compliance** (Epics 05, 08, 14, 16)
5. **P4 — Product Capabilities to GA** (Epics 17, 18, 19, 20)
6. **P5 — DR/Chaos Confidence** (Epics 09, 22)
7. **P6 — Release Train & Evidence** (Epic 21)
8. **P7 — Alert Hygiene & Runbooks** (Epic 23)
9. **P8 — GA Flip + 24h KPI Review** (close-out)

---

## Sub-agents (declare each as an agent with its own tool belt)

### 1) **Release Conductor**

**Goal:** Drive phases, verify gates, compile evidence, own promote/rollback.
**Core tasks:**

- Enforce required checks: `slo-gates`, `migration-gate`, `supply-chain`, `performance-gate`, `policy-ci`.
- Run release workflows; attach signed evidence; post notes & comms.
  **Success:** GA tag pushed, evidence verified, rollback drill demonstrated.

### 2) **CI/CD Engineer**

**Goal:** Wire all workflows; preview TTL/budgets; artifact caching.
**Tasks:** finalize `.github/workflows/*` for Epics 01–07, 11, 21; fix stubs; required checks → branch protections.
**Success:** All pipelines green on demo PRs; preview infra auto-tears down; cost guard enforced.

### 3) **DevOps/Platform**

**Goal:** Helm/Terraform golden path; pod security; HPA/KEDA; pgBouncer.
**Tasks:** enforce non-root/read-only FS, quotas, network policies; HPA tuned per perf headroom.
**Success:** Stage runs 48h clean; security policies pass; image size budgets met.

### 4) **SLO/Observability Lead**

**Goal:** Golden paths (catalog + probes), dashboards, SLO burn alerts.
**Tasks:** synth-probe jobs in preview/stage/prod; Grafana panels; link traces in PRs.
**Success:** SLO-gated canary blocks/advances correctly; probes produce traces/metrics.

### 5) **Supply Chain & Security**

**Goal:** SBOMs, SLSA provenance, cosign signatures, vuln diff budgets, OPA policies.
**Tasks:** sign & verify at build and deploy; deny on new criticals; exceptions time-boxed.
**Success:** Promotion blocked on any missing attestation/signature; dashboard shows vuln trend.

### 6) **Schema/Migrations Captain**

**Goal:** Expand/contract with shadow reads & dual-write; backfill; rollback plans.
**Tasks:** migration-gate; shadow parity; dry-run artifacts; contract after 7d no-reads.
**Success:** Two demo migrations pass the full gate; rollback drill on stage succeeds.

### 7) **Data Plane Owner**

**Goal:** Postgres/Neo4j/Redis/Typesense readiness; client timeouts/retries/breakers; index hygiene.
**Success:** Query budgets met; RLS/tenant isolation enforced; advisor PRs raised weekly.

### 8) **Flags & Rollout**

**Goal:** Typed SDKs, catalog, auto-ramp with canary, kill-switch runbooks.
**Success:** Live ramp 0→25→50→100%; auto-kill on breach; stale flags cleaned.

### 9) **AuthZ/Compliance**

**Goal:** OPA RBAC/ABAC; step-up + RFA; decision logging; Gatekeeper/Conftest.
**Success:** Elevated actions require step-up + RFA; decision logs and dashboards healthy.

### 10) **DR/BCP Lead**

**Goal:** Cross-region backups; failover/cutback scripts; monthly drills.
**Success:** Timed drill meets RTO≤30m/RPO≤5m; evidence archived.

### 11) **Perf Engineer**

**Goal:** k6 models & thresholds; perf-predict headroom; HPA tuning.
**Success:** 3× spike handled; headroom ≥20%; perf gate enforces thresholds.

### 12) **Realtime (Graph Subscriptions)**

**Goal:** WS + SSE fanout; ordered per tenant; resume from checkpoint.
**Success:** p95 delivery lag within budget; replay works; QoS degradation signaled.

### 13) **Reporting/PDF**

**Goal:** Deterministic Playwright render; redaction; signing; async chunk/merge.
**Success:** 150–200 page report SLO met; redaction verified; artifacts signed.

### 14) **Search/Typesense**

**Goal:** Versioned schemas + alias, indexer with <60s lag, parity reindex.
**Success:** GA flip with zero downtime; relevance tuned; scoped search-only keys.

### 15) **Ingest/ETL**

**Goal:** Backpressure + DLQ + replay; exactly-once-effect at sinks.
**Success:** 3× burst stable; tenant/time replay idempotent; DLQ triage & redrive.

### 16) **Chaos Captain**

**Goal:** Stage chaos + canary rollback drills; signed evidence; guardrails.
**Success:** Auto-rollback ≤5 min proven; issues opened for gaps.

### 17) **Runbook & Alert Arborist**

**Goal:** 100% Sev1/2 alerts have owners + runbooks; noise ↓ ≥40%.
**Success:** Alert hygiene CI passes; monthly drills succeed.

---

## Execution plan (stepwise)

### P0 — Readiness

- CI/CD Engineer: enable required checks; labeler + conventional commits; CODEOWNERS enforced.
- Supply Chain: turn on supply-chain-gates workflow; cosign keyless or managed key.
- DevOps: apply container hardening; Helm `_security.tpl` included; size budget script active.

**Gate:** `container-hardening`, `supply-chain`, `policy-ci` all green.

### P1 — Gates & Baselines

- Observability: commit `golden_paths.yaml`; deploy synth-probe in previews/stage.
- CI/CD: wire `verify_goldens.sh` & PromQL checks; PR previews cost/TTL + budget guard.
- Perf: run baseline k6, record headroom; set HPA behaviors.

**Gate:** `slo-gates`, `performance-gate`, preview budgets passing.

### P2 — Data Safety

- Migrations: implement migration-gate; dry-run + shadow parity in preview; dual-write flags.
- Data Plane: enable pgBouncer; index catalog; slow-query lint; RLS.

**Gate:** migration-gate passes with artifacts; data budgets met 48h in stage.

### P3 — Security/Compliance

- AuthZ: OPA policies (RBAC/ABAC/obligations) compiled to Wasm; step-up + RFA enforced.
- Audit/RFA: hash-chained events; evidence export tool.
- Identity: OIDC + WebAuthn; SCIM dry-run; deprovision revokes sessions <60s.

**Gate:** audits present; decision logs & identity dashboards green.

### P4 — Product GA

- Realtime: WS+SSE fanout; resume; dashboards; soak test.
- Reporting: renderer service; redaction tests; signing & provenance.
- Search: schemas + indexer; alias reindex parity; tenant filters enforced.
- Ingest: backpressure + DLQ + replayctl; chaos on ingest slowness.

**Gate:** product SLOs green 48h; parity/reindex success; ingest lag <60s.

### P5 — DR/Chaos

- DR: backups verified; failover→cutback drill; flags for freeze/writemode.
- Chaos: two stage scenarios + one canary rollback drill; evidence signed.

**Gate:** DR drill within targets; chaos evidence uploaded; gaps addressed.

### P6 — Release Train

- Conductor: cut `release/v{{X.Y.Z}}-rc.1`; stage canary; generate notes; prepare evidence.
- Promote: prod canary 10→50→100 with SLO/Perf/Supply-Chain gates; flip GA flags per plan.
- On breach: auto-rollback to prior digests; kill high-risk flags; open incident.

**Gate:** final tag signed; evidence bundle attached.

### P7 — Alert Hygiene

- Arborist: catalog→PrometheusRule; runbook template; noisy-alert issues created.

### P8 — GA Flip & +24h KPI

- Conductor: run KPI compare; open regression issues with owners; close release.

---

## Promotion & rollback criteria (must implement)

- **Promote:** all required checks green; no SLO burn; perf headroom ≥20%; migration cutover criteria met; SBOM diffs within budget; DR freshness OK.
- **Rollback:** any guard breach or golden-path failure persists >N minutes; previous digests redeployed; golden paths re-green; audit event recorded.

---

## Evidence pack (minimum contents)

- SBOMs + attestation + signatures (per image)
- SLO/probe graphs; perf headroom; chaos/DR drill outputs
- Migration plans + shadow parity + backfill status
- Release notes; commit range; approvals matrix
- Audit/RFA excerpts; identity & AuthZ decision stats
- Alert hygiene snapshot; top issues created

---

## GA switch list (flip only after promote)

- `search.ga.enabled=true`
- `realtime.enabled=true` (per pilot tenants → all)
- `reports.renderer.v2.enabled=true`
- Any per-feature flags required for MVP-3 scope

---

## Agent entry prompt (template for each sub-agent)

```
You are the {{AGENT_NAME}} for MVP-3→GA.

Objective: {{OBJECTIVE}}

Repository: {{REPO_NAME}}. Work only via IaC (Helm/Terraform) and CI workflows.

Deliverables:
- Files/PRs to modify/add: {{KEY_PATHS}}
- CI job names that must pass: {{CHECKS}}
- Artifacts to produce: {{ARTIFACTS}}
- Dashboards/alerts to confirm: {{DASHBOARDS}}

Constraints:
- Secrets via SOPS + Sealed-Secrets
- Images signed + SBOM + SLSA
- OPA policies enforced
- Emit OTEL spans + structured logs

Output:
Return JSON with fields: phase, action, result, links (PRs, dashboards), artifacts, trace_id, next_step.
```

---

## Kickoff commands (Conductor issues these in order)

1. **Bootstrap checks**
   - Ask CI/CD Engineer: “Confirm required checks present & enforced; attach branch-protection export.”

2. **Golden paths + SLO gates**
   - Ask Observability Lead: “Publish `golden_paths.yaml`, run probes in preview/stage, wire `verify_goldens.sh`.”

3. **Supply chain**
   - Ask Security: “Enable `supply-chain-gates`; show cosign verify at deploy time.”

4. **Migrations**
   - Ask Schema Captain: “Create `migration-gate.yml`, run demo Postgres+Neo4j dry-runs, show shadow parity.”

5. **Perf**
   - Ask Perf: “Run baseline k6; report headroom; tune HPA; enforce `performance-gate`.”

6. **Product**
   - Ask Realtime/Search/Reporting/Ingest owners to land GA-ready features with SLO dashboards.

7. **DR/Chaos**
   - Ask DR & Chaos captains to run drills and upload evidence.

8. **Release**
   - Trigger `release-train.yml` → `release-promote.yml`; attach signed evidence and notes; flip GA flags.

9. **Post-release**
   - Run +24h KPI compare; open regressions; confirm all alerts mapped to runbooks.

---

## Stop conditions / escalation

- Any **critical** finding (security, SLO burn, data integrity) → **halt**, open incident, execute rollback runbook, escalate to `{{ONCALL_HANDLES}}`.

---

**End of master prompt.**
