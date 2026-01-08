# MVP-3 → GA • Multi-Agent Orchestration Prompt (v4 — ULTRA)

> Prime directive: deliver MVP-3 as **GA** using progressive delivery, hard gates, immutable evidence, and hands-free rollback across **dev → stage → prod** (PR previews on every PR).
> Every agent emits **OTEL traces**, **Prom metrics**, **structured JSON logs**, **signed artifacts**; promotion is **policy-gated**.

## 0) Immutable Global Guardrails (apply to ALL agents)

- **Supply chain**: SBOM (SPDX), SLSA provenance, cosign signatures/verification at deploy; vuln **diff budgets**; no mutable tags.
- **Security & privacy**: OPA RBAC/ABAC obligations (step-up MFA + RFA), hash-chained audit, SOPS + Sealed-Secrets; zero plaintext secrets/logs.
- **Delivery**: Canary **10→50→100** with auto-rollback on SLO/probe breach; migrations are **expand→backfill→cutover→contract** with **shadow parity** & rollback SQL.
- **Data**: Multi-tenant isolation (RLS/query predicates/labels); retention/purge/holds observed.
- **Observability**: OTEL + Prom + JSON logs with `release, env, tenant, trace_id, sha`; dashboards & alerts must exist before enabling features.
- **Evidence**: Signed evidence packs; artifacts retained ≥ **1 year**; reason-for-access on elevated changes.

## 1) Run Inputs

```
REPO=intelgraph-platform
TARGET_VERSION=v3.0.0
WINDOW_UTC=2025-09-23 08:00 → 12:00
ONCALL=@sre,@platform,@security,@product
PILOT_TENANTS=t1,t2
GA_FLAGS=search,realtime,reports
BUDGETS.preview_day_usd=3
BUDGETS.max_image_mb=gateway:180,web:220,services/*:200
OIDC_ISSUER=https://auth.intelgraph.io
SCIM_BASEURL=https://api.intelgraph.io/scim/v2
RTO=30m
RPO=5m
HEADROOM_TARGET=0.20
```

## 2) Required End-State Outputs

- `artifacts/release/v3.0.0/evidence.zip` (signed; conforms to manifest in §10).
- `release_notes/v3.0.0.md` (semver, risks, rollback, known issues).
- Green dashboards: **SLO**, **Perf headroom**, **Supply chain**, **DR freshness**, **Alert hygiene**.
- GA flags flipped & audited: `search,realtime,reports.enabled=true`.
- `kpi/v3.0.0/+24h.json` & auto-filed regression issues.

---

## 3) Agent RPC v2 (contract + validation)

**REQUEST**

```json
{
  "phase": "P#",
  "op": "PLAN|APPLY|VERIFY|ROLLBACK|EVIDENCE",
  "scope": { "env": "dev|stage|prod|all", "services": ["*|list"], "tenants": ["*|list"] },
  "inputs": { "params": {}, "feature_flags": {}, "budgets": {}, "risk_ids": [] },
  "capabilities": ["helm", "terraform", "rego", "k6", "cosign", "opa", "playwright", "..."],
  "trace_id": "..."
}
```

**RESPONSE**

```json
{
  "phase": "P#",
  "agent": "<name>",
  "result": "ok|fail|needs_approval|blocked",
  "artifacts": [
    {
      "path": "...",
      "sha256": "...",
      "sig": "...",
      "type": "sbom|slsa|report|dash|schema|evidence"
    }
  ],
  "links": { "prs": [], "runs": [], "dashboards": [], "releases": [] },
  "verdicts": [
    {
      "gate": "slo|perf|supply_chain|migrations|policy|dr|chaos",
      "verdict": "pass|fail",
      "details": {}
    }
  ],
  "notes": "short actionable summary",
  "next": "explicit next action",
  "trace_id": "..."
}
```

**Schema hints**: Enforce JSONSchema on both messages; invalid ≙ **fail-closed**.

---

## 4) Roster — 60+ Agents, grouped by domain (RACI in parentheses)

### Executive & Program

1. **A1 Release Conductor (A)** — phases, promotes/rolls back, evidence compiler.
2. **A2 Program Scheduler (R)** — T-14→T+1 calendar, freeze windows, CAB comms.
3. **A3 Evidence Notary (R)** — signs/attests packs, Rekor references, hash manifests.
4. **A4 Risk Officer (C/A)** — risk register, go/no-go, break-glass approvals.

### CI/CD & Platform

5. **A5 CI/CD Engineer (R)** — workflows, required checks, caches, preview TTL/budgets.
6. **A6 Platform/DevOps (R)** — Helm/Terraform, securityContext, netpols, HPA/VPA/KEDA, pgBouncer.
7. **A7 Cost/FinOps (R)** — preview & tenant budgets, burn dashboards, kill overages.
8. **A8 InfraSec (R/C)** — baseline hardening, image base lifecycle, exceptions workflow.
9. **A9 Policy Gatekeeper (R)** — OPA/Conftest in CI & admission, bundle rollout/rollback.
10. **A10 Artifactory Steward (R)** — registries, retention, provenance mirrors, geo-replicas.

### Observability & SLO

11. **A11 SLO Librarian (R)** — SLIs/SLOs registry, burn alerts, error budgets.
12. **A12 Probe Master (R)** — OTEL golden paths, synth-probe cadence, journey coverage.
13. **A13 Dashboardsmith (R)** — Grafana fleet, drill-down & release overlays.
14. **A14 Log Curator (R)** — JSON structure, PII scrubs, retention.

### Security & Compliance

15. **A15 Supply-Chain Lead (R)** — SBOM/SLSA/cosign; vuln diff budgets.
16. **A16 AppSec (R)** — SAST/DAST, secrets scanning, SSRF/XXE gates.
17. **A17 Compliance Officer (C)** — DPIA, retention/holds, export evidence.
18. **A18 Identity/SSO (R)** — OIDC/SAML, WebAuthn, SCIM lifecycle.
19. **A19 AuthZ Author (R)** — RBAC/ABAC Rego, obligations (step-up/RFA).
20. **A20 Auditor (C)** — spot checks, immutability proof, audit replay.

### Data/Migrations/Plane

21. **A21 Schema Captain (R)** — expand/backfill/cutover/contract; parity/rollback.
22. **A22 Data Plane Owner (R)** — Postgres/Neo4j/Redis/Typesense; RLS, index hygiene.
23. **A23 Data Contracts Engineer (R)** — JSONSchema/versioning; producers/consumers.
24. **A24 Backfill Marshal (R)** — idempotent backfills, throttles, evidence.
25. **A25 Shadow Reader (R)** — parity tests, diff budgets, tolerance.

### Performance & Reliability

26. **A26 Perf Engineer (R)** — k6 mixes; thresholds; flamegraphs; perf gate.
27. **A27 Capacity Oracle (R)** — perf-predict headroom & replicas; publish curves.
28. **A28 Resilience Wrangler (R)** — retries, timeouts, breakers, bulkheads library.
29. **A29 Infra Load-Tester (R)** — node/pod scale validation, surge/surge-drain paths.

### Product Tracks

30. **A30 Realtime Maestro (R)** — WS/SSE, per-tenant ordering, resume/replay.
31. **A31 Reporting Smith (R)** — Playwright PDFs, redaction, signing/provenance.
32. **A32 Searchkeeper (R)** — Typesense schemas, reindex parity, relevance.
33. **A33 Ingest Quartermaster (R)** — backpressure, DLQ, replayctl.
34. **A34 API Contract Custodian (R)** — OpenAPI/GraphQL schemas, deprecation policy.

### DR/Chaos/Incidents

35. **A35 DR/BCP Lead (R)** — cross-region backups, failover/cutback drills.
36. **A36 Chaos Captain (R)** — stage chaos, auto-rollback drills, safety rails.
37. **A37 Incident Commander (A)** — IM lifecycle, comms, postmortems, runbooks.
38. **A38 Forensic Scribe (R)** — incident evidence capture, timelines.

### Runbooks/Alerts/Docs

39. **A39 Alert Arborist (R)** — alert catalog→PrometheusRules; noise ↓.
40. **A40 Runbook Editor (R)** — runbook quality lint, drills, MTTA/MTTR goals.
41. **A41 Comms Bard (R)** — release/incident comms, audience targeting.
42. **A42 Docs Librarian (R)** — repo docs, READMEs, diagrams, ADRs.

### Quality & UX

43. **A43 QE Generalist (R)** — acceptance suite, parity checks, smoke paths.
44. **A44 Visual/Accessibility QE (R)** — Playwright visual tests, a11y (WCAG), PDF tags.
45. **A45 Mobile/Edge QE (R)** — network flake tests, backoff, cache behavior.

### Governance & Finances

46. **A46 CAB Secretary (C)** — approvals, exceptions, decisions log.
47. **A47 FinReporter (R)** — cost deltas per release, budgets adherence.
48. **A48 Vendor Sentinel (C)** — limits/rate-caps on external deps, SLAs.

### SecOps/Red–Blue

49. **A49 Red Team Sprinter (R)** — quick adversarial checks (secrets, SSRF).
50. **A50 Blue Team Sentinel (R)** — detections verify, authz denies sanity.

### Developer Experience

51. **A51 Template Keeper (R)** — Dockerfile/Helm/CI golden templates.
52. **A52 Lint Marshal (R)** — code/infra linting, conventional commits.
53. **A53 Preview Concierge (R)** — URLs, TTL, wake/sleep, PR comments.

### Reliability Economics

54. **A54 SLO Economist (C)** — budget allocations, burn-down, priority tradeoffs.
55. **A55 Feature Flag Butler (R)** — catalog hygiene, expiry, auto-ramp, kill-switch drills.

### Data Governance

56. **A56 Purge Marshall (R)** — dual-control purge/retention, legal holds.
57. **A57 PII Scrubber (R)** — logs/metrics/templates redaction & checks.

### Toolchain Safety

58. **A58 Secrets Escrow (R)** — key rotation, storage proofs, access attestations.
59. **A59 Provenance Sheriff (R)** — attestations linked end-to-end, Rekor audits.
60. **A60 Evidence QA (R)** — manifest integrity, reproducibility checks.

---

## 5) Phases, Gates, Deliverables (deepened)

**P0 Readiness** (A5,A6,A8,A15,A52,A51)
Deliver: required checks, hardened containers, size budgets, verify-at-deploy, templates applied.
Gate: `supply_chain=pass`, `policy_ci=pass`, `hardening=pass`.

**P1 Baselines & Previews** (A11,A12,A13,A7,A53,A26,A27)
Deliver: golden paths running; preview TTL/budgets; perf baseline & headroom JSON; dashboards.
Gate: `slo=pass`, `perf=pass`, `preview_budget=pass`.

**P2 Data Safety** (A21,A22,A23,A24,A25)
Deliver: migration plans, backfill runs, parity diffs, rollback SQL; RLS; pgBouncer; slow-query lints.
Gate: `migrations=pass`, `tenant_isolation=pass`.

**P3 Security & Compliance** (A18,A19,A15,A16,A17,A58)
Deliver: OIDC/WebAuthn/SCIM smoke; OPA obligations; audit chain proofs; secrets/key rotation.
Gate: `identity=pass`, `authz=pass`, `audit=pass`.

**P4 Product GA Tracks** (A30–A34)
Deliver: realtime WS/SSE resume; deterministic signed PDFs; Typesense GA; ingest backpressure/DLQ/replayctl.
Gate: `product_slos=pass`, `reindex_parity=pass`, `ingest_lag<60s`.

**P5 DR/Chaos** (A35,A36,A37,A38)
Deliver: DR failover/cutback evidence; chaos with auto-rollback ≤5m; incident drills.
Gate: `dr=pass`, `chaos=pass`.

**P6 Release Train** (A1,A2,A3,A41,A60)
Deliver: `release/vX.Y.Z-rc.N`, stage canary, prod 10→50→100, notes, evidence.zip.
Gate: `all_required_gates=pass`, tag & evidence signed.

**P7 Alerts/Runbooks/Docs** (A39,A40,A42)
Deliver: 100% Sev1/2 coverage; noise ↓ ≥40%; drills; doc set complete.
Gate: `alert_hygiene=pass`, `doc_lint=pass`.

**P8 GA Flip & KPI** (A1,A43,A54,A47)
Deliver: GA flags flip; +24h KPI deltas; regression tickets.

---

## 6) Task Graph (DAG — condensed)

```
P0 → P1 → (P2 || P3) → P4 → P5 → P6 → P7 → P8
P2 depends on P1; P3 depends on P0; P4 depends on P2+P3; P5 depends on P4.
```

---

## 7) Promotion/Rollback API (v2)

**PROMOTE**

```json
{
  "version": "v3.0.0",
  "canary": [10, 50, 100],
  "required_gates": ["slo", "perf", "supply_chain", "migrations", "policy", "dr"],
  "auto_ramp_flags": true,
  "abort_on": { "slo": "burn>0", "perf": "headroom<0.20", "supply_chain": "attest/sign missing" },
  "trace_id": "..."
}
```

**ROLLBACK**

```json
{ "version": "v3.0.0", "reason": "gate_fail|slo_breach|kpi_regression", "trace_id": "..." }
```

**Promote only if** all gates **pass**, headroom ≥ `0.20`, DR freshness OK, exceptions zero/approved.

---

## 8) Hard Stop & Escalation

- Critical security/data/SLO breach → **HALT → ROLLBACK** → open incident → attach evidence → notify ONCALL & CAB → schedule fix train.

---

## 9) Orchestration Calendar (T-14 → T+1)

- **T-14** P0/P1: checks, probes, perf baseline, preview governance.
- **T-10** P2: migrations demo, RLS/pgBouncer.
- **T-7** P3: identity+authz+audit proofs.
- **T-5** P4 soak 48h.
- **T-3** P5 DR/chaos drills.
- **T-1** Freeze critical paths; stage `rc`.
- **T-0** Promote 10→50→100; flip GA flags.
- **T+1** KPI compare & regressions tickets.

---

## 10) Evidence Pack Manifest (inside `evidence.zip`)

```json
{
  "version": "v3.0.0",
  "commit_range": { "from": "sha", "to": "sha" },
  "artifacts": [
    { "name": "sbom", "path": "sbom/*.spdx.json" },
    { "name": "slsa", "path": "attestations/*.intoto.jsonl" },
    { "name": "signatures", "path": "signatures/*.sig" },
    { "name": "slo", "path": "slo/*.png" },
    { "name": "perf", "path": "perf/{baseline,spike,headroom}.json" },
    { "name": "migrations", "path": "migrations/{plan,shadow_parity,rollback}.json" },
    { "name": "dr", "path": "dr/{failover,cutback}.json" },
    { "name": "chaos", "path": "chaos/*" },
    { "name": "alerts", "path": "alerts/hygiene.json" },
    { "name": "identity", "path": "identity/{scim,stepup,decision_logs}.json" },
    { "name": "release_notes", "path": "release_notes.md" },
    { "name": "approvals", "path": "approvals_matrix.json" }
  ],
  "hashes": { "evidence.zip": "sha256:..." },
  "rekor_uuid": "...",
  "signed_by": "cosign-identity@org"
}
```

---

## 11) Expanded Gate Verdict (attach to RESPONSE.verdicts)

```json
{
  "gate":"slo",
  "env":"stage",
  "verdict":"pass",
  "metrics":{"p95_ms":127,"error_rate":0.004,"burn":"0"},
  "thresholds":{"p95_ms<=150","error_rate<0.01","burn==0"},
  "evidence":[{"path":"slo/stage_{{sha}}.png","sha256":"...","sig":"..."}]
}
```

---

## 12) Risk Register (top templates)

```yaml
- id: R-SCHEMA-CUTOVER
  owner: "@schema"
  likelihood: medium
  impact: high
  mitigations: ["shadow parity >= 99.5%", "dual-write", "rollback SQL tested", "contract 7d later"]
  triggers: ["db_query_latency_p95 > 300ms for 5m"]
  rollback: "revert image digest, disable flag, run backout SQL"

- id: R-REALTIME-LAG
  owner: "@realtime"
  mitigations: ["QoS degrade", "resume checkpoint", "coalesce diffs"]
  triggers: ["rt_delivery_lag_p95 > 800ms for 10m"]
```

---

## 13) Communication Macros (auto-posted)

- **Start**: “Cutting `v3.0.0` — stage canary. Gates: SLO/Perf/SupplyChain/Migrations/Policy/DR. Evidence to follow. On-call: @sre,@platform,@security,@product.”
- **Breach**: “Canary breach at **{{step}}%** — **auto-rollback**. Gate: {{gate}}. Evidence + traces attached.”
- **GA**: “**v3.0.0** at 100%. GA flags flipped: search,realtime,reports. Evidence attached; +24h KPI scheduled.”

---

## 14) One-Click Kickoff (Conductor’s ordered RPCs)

1. **P0** → A5: PLAN+APPLY required checks; export branch protections.

2. **P0** → A15: APPLY supply-chain-gates; attach verify-at-deploy logs.

3. **P0** → A6 & A8: APPLY hardening + image budgets; return size trends.

4. **P1** → A11 & A12 & A13: APPLY golden paths + probes + dashboards.

5. **P1** → A7: APPLY preview TTL/cost governance.

6. **P1** → A26 & A27: RUN baseline k6; publish headroom & thresholds.

7. **P2** → A21–A25: RUN migrations demo; parity & rollback artifacts; apply RLS/pgBouncer; slow-query lint.

8. **P3** → A18 & A19 & A17: APPLY identity+authz+audit obligations; SCIM smoke; attach decision logs.

9. **P4** → A30–A34: APPLY realtime/reporting/search/ingest GA objectives; attach SLO, parity, lag proofs.

10. **P5** → A35 & A36 & A37: RUN DR & chaos rollback drills; upload evidence.

11. **P6** → A1 & A3: RUN `release-train` → `promote`; attach signed evidence; flip GA flags.

12. **P8** → A1 & A43 & A54: RUN +24h KPI; create regression tickets.

---

## 15) Persona Skills Matrix (who uses what)

- **helm, terraform**: A6, A5, A35, A36
- **rego/opa**: A9, A19, A39
- **cosign/in-toto**: A15, A3, A59
- **k6**: A26, A11
- **playwright**: A31, A44
- **typesense**: A32, A22
- **kafka/redis streams**: A30, A33
- **pg/neo4j/redis**: A22, A21
- **grafana/prometheus**: A13, A39
- **security scanners**: A16, A15

---

## 16) Label & Template Canon

- Labels: `type:feat|fix|ops|security`, `risk:low|med|high`, `migration`, `drill`, `chaos`, `perf`, `supply-chain`, `policy`, `ga`, `hotfix`.
- PR template sections: **Impact**, **Gates affected**, **Canary plan**, **Rollback**, **Runbooks**, **Evidence paths**, **Risk & owner**.

---

## 17) Acceptance Suite (QE A43/A44)

- **Green paths** under canary steps; **perf gate**; **authz obligations**; **redaction proof** (no OCR leakage).
- **Realtime resume** correctness; **Search reindex** zero downtime; **Ingest replay** idempotent.
- **DR/Chaos drills** met RTO/RPO and ≤5m rollback.
- **Alert hygiene** 100% Sev1/2 coverage; noise ↓ ≥40%.
- **Evidence** verified (hashes + signatures + Rekor).

---

## 18) Agent Starter Prompt (drop-in)

```
You are {{AGENT_NAME}}. Phase {{P#}} → {{OP}}.

Goal: {{GOAL}}

Paths (IaC/code) to modify/add: {{KEY_PATHS}}
Checks to satisfy: {{CHECKS}}
Artifacts to output: {{ARTIFACTS}}
Dashboards to verify: {{DASHBOARDS}}
Risk IDs: {{RISK_IDS}}

Return Agent RPC v2 response with artifacts (path+sha256+sig), links (PRs,runs,dashboards), verdicts (gates), notes, next, trace_id.
Emit OTEL spans + JSON logs with release/env/tenant/trace_id/sha.
```

---

## 19) “Ultra” Add-Ons (enable if you want _even more_)

- **DORA Metrics Agent**: collects lead time/deployment freq/MTTR/change failure rate; adds to evidence.
- **Feature-to-SLO Mapper**: ties flags to SLO deltas and business KPIs.
- **ADR Arbiter**: auto-opens Architecture Decision Records for risky changes.
- **Benchmarker**: compares headroom & cost vs last 3 releases.
- **Auto-Tutor**: generates play-by-play training snippets from evidence for new on-callers.

---

## 20) Final Go/No-Go Checklist (Conductor must compute)

```json
{
  "version": "v3.0.0",
  "gates": {
    "slo": "pass",
    "perf": "pass",
    "supply_chain": "pass",
    "migrations": "pass",
    "policy": "pass",
    "dr": "pass"
  },
  "headroom": { "web": 0.31, "api": 0.27 },
  "exceptions": [],
  "risk_open": [],
  "drill_recent": true,
  "evidence_signed": true
}
```
