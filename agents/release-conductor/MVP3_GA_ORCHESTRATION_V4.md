# MVP-3 → GA • Multi-Agent Orchestration Prompt (v4 — ULTRA)

> **Last Updated**: 2025-12-19
> **Version**: 4.0.0 (ULTRA)
> **Purpose**: Deliver MVP-3 as **GA** using progressive delivery, hard gates, immutable evidence, and hands-free rollback across **dev → stage → prod** (PR previews on every PR).

Every agent emits **OTEL traces**, **Prom metrics**, **structured JSON logs**, **signed artifacts**; promotion is **policy-gated**.

---

## 0) Immutable Global Guardrails (apply to ALL agents)

- **Supply chain**: SBOM (SPDX), SLSA provenance, cosign signatures/verification at deploy; vuln **diff budgets**; no mutable tags.
- **Security & privacy**: OPA RBAC/ABAC obligations (step-up MFA + RFA), hash-chained audit, SOPS + Sealed-Secrets; zero plaintext secrets/logs.
- **Delivery**: Canary **10→50→100** with auto-rollback on SLO/probe breach; migrations are **expand→backfill→cutover→contract** with **shadow parity** & rollback SQL.
- **Data**: Multi-tenant isolation (RLS/query predicates/labels); retention/purge/holds observed.
- **Observability**: OTEL + Prom + JSON logs with `release, env, tenant, trace_id, sha`; dashboards & alerts must exist before enabling features.
- **Evidence**: Signed evidence packs; artifacts retained ≥ **1 year**; reason-for-access on elevated changes.

---

## 1) Run Inputs

```yaml
REPO: {{summit-2025.09.23.1710}}
TARGET_VERSION: {{v3.0.0}}
WINDOW_UTC: {{YYYY-MM-DD HH:MM → HH:MM}}
ONCALL: {{@sre,@platform,@security,@product}}
PILOT_TENANTS: {{t1,t2}}
GA_FLAGS: {{search,realtime,reports}}

BUDGETS:
  preview_day_usd: {{3}}
  max_image_mb:
    gateway: 180
    web: 220
    services/*: 200

OIDC_ISSUER: {{...}}
SCIM_BASEURL: {{...}}
RTO: {{30m}}
RPO: {{5m}}
HEADROOM_TARGET: {{0.20}}
```

---

## 2) Required End-State Outputs

- `artifacts/release/{{TARGET_VERSION}}/evidence.zip` (signed; conforms to manifest in §10).
- `release_notes/{{TARGET_VERSION}}.md` (semver, risks, rollback, known issues).
- Green dashboards: **SLO**, **Perf headroom**, **Supply chain**, **DR freshness**, **Alert hygiene**.
- GA flags flipped & audited: `{{GA_FLAGS}}.enabled=true`.
- `kpi/{{TARGET_VERSION}}/+24h.json` & auto-filed regression issues.

---

## 3) Agent RPC v2 (contract + validation)

### REQUEST

```json
{
  "phase": "P#",
  "op": "PLAN|APPLY|VERIFY|ROLLBACK|EVIDENCE",
  "scope": {
    "env": "dev|stage|prod|all",
    "services": ["*|list"],
    "tenants": ["*|list"]
  },
  "inputs": {
    "params": {},
    "feature_flags": {},
    "budgets": {},
    "risk_ids": []
  },
  "capabilities": ["helm", "terraform", "rego", "k6", "cosign", "opa", "playwright", "..."],
  "trace_id": "..."
}
```

### RESPONSE

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
  "links": {
    "prs": [],
    "runs": [],
    "dashboards": [],
    "releases": []
  },
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

## 4) Roster — 63 Agents, grouped by domain (RACI in parentheses)

### Executive & Program

| ID  | Agent             | Role | Responsibility                                        |
| --- | ----------------- | ---- | ----------------------------------------------------- |
| A1  | Release Conductor | A    | Phases, promotes/rolls back, evidence compiler        |
| A2  | Program Scheduler | R    | T-14→T+1 calendar, freeze windows, CAB comms          |
| A3  | Evidence Notary   | R    | Signs/attests packs, Rekor references, hash manifests |
| A4  | Risk Officer      | C/A  | Risk register, go/no-go, break-glass approvals        |

### CI/CD & Platform

| ID  | Agent               | Role | Responsibility                                                    |
| --- | ------------------- | ---- | ----------------------------------------------------------------- |
| A5  | CI/CD Engineer      | R    | Workflows, required checks, caches, preview TTL/budgets           |
| A6  | Platform/DevOps     | R    | Helm/Terraform, securityContext, netpols, HPA/VPA/KEDA, pgBouncer |
| A7  | Cost/FinOps         | R    | Preview & tenant budgets, burn dashboards, kill overages          |
| A8  | InfraSec            | R/C  | Baseline hardening, image base lifecycle, exceptions workflow     |
| A9  | Policy Gatekeeper   | R    | OPA/Conftest in CI & admission, bundle rollout/rollback           |
| A10 | Artifactory Steward | R    | Registries, retention, provenance mirrors, geo-replicas           |

### Observability & SLO

| ID  | Agent          | Role | Responsibility                                           |
| --- | -------------- | ---- | -------------------------------------------------------- |
| A11 | SLO Librarian  | R    | SLIs/SLOs registry, burn alerts, error budgets           |
| A12 | Probe Master   | R    | OTEL golden paths, synth-probe cadence, journey coverage |
| A13 | Dashboardsmith | R    | Grafana fleet, drill-down & release overlays             |
| A14 | Log Curator    | R    | JSON structure, PII scrubs, retention                    |

### Security & Compliance

| ID  | Agent              | Role | Responsibility                                |
| --- | ------------------ | ---- | --------------------------------------------- |
| A15 | Supply-Chain Lead  | R    | SBOM/SLSA/cosign; vuln diff budgets           |
| A16 | AppSec             | R    | SAST/DAST, secrets scanning, SSRF/XXE gates   |
| A17 | Compliance Officer | C    | DPIA, retention/holds, export evidence        |
| A18 | Identity/SSO       | R    | OIDC/SAML, WebAuthn, SCIM lifecycle           |
| A19 | AuthZ Author       | R    | RBAC/ABAC Rego, obligations (step-up/RFA)     |
| A20 | Auditor            | C    | Spot checks, immutability proof, audit replay |

### Data/Migrations/Plane

| ID  | Agent                   | Role | Responsibility                                     |
| --- | ----------------------- | ---- | -------------------------------------------------- |
| A21 | Schema Captain          | R    | Expand/backfill/cutover/contract; parity/rollback  |
| A22 | Data Plane Owner        | R    | Postgres/Neo4j/Redis/Typesense; RLS, index hygiene |
| A23 | Data Contracts Engineer | R    | JSONSchema/versioning; producers/consumers         |
| A24 | Backfill Marshal        | R    | Idempotent backfills, throttles, evidence          |
| A25 | Shadow Reader           | R    | Parity tests, diff budgets, tolerance              |

### Performance & Reliability

| ID  | Agent               | Role | Responsibility                                     |
| --- | ------------------- | ---- | -------------------------------------------------- |
| A26 | Perf Engineer       | R    | k6 mixes; thresholds; flamegraphs; perf gate       |
| A27 | Capacity Oracle     | R    | Perf-predict headroom & replicas; publish curves   |
| A28 | Resilience Wrangler | R    | Retries, timeouts, breakers, bulkheads library     |
| A29 | Infra Load-Tester   | R    | Node/pod scale validation, surge/surge-drain paths |

### Product Tracks

| ID  | Agent                  | Role | Responsibility                                 |
| --- | ---------------------- | ---- | ---------------------------------------------- |
| A30 | Realtime Maestro       | R    | WS/SSE, per-tenant ordering, resume/replay     |
| A31 | Reporting Smith        | R    | Playwright PDFs, redaction, signing/provenance |
| A32 | Searchkeeper           | R    | Typesense schemas, reindex parity, relevance   |
| A33 | Ingest Quartermaster   | R    | Backpressure, DLQ, replayctl                   |
| A34 | API Contract Custodian | R    | OpenAPI/GraphQL schemas, deprecation policy    |

### DR/Chaos/Incidents

| ID  | Agent              | Role | Responsibility                                  |
| --- | ------------------ | ---- | ----------------------------------------------- |
| A35 | DR/BCP Lead        | R    | Cross-region backups, failover/cutback drills   |
| A36 | Chaos Captain      | R    | Stage chaos, auto-rollback drills, safety rails |
| A37 | Incident Commander | A    | IM lifecycle, comms, postmortems, runbooks      |
| A38 | Forensic Scribe    | R    | Incident evidence capture, timelines            |

### Runbooks/Alerts/Docs

| ID  | Agent          | Role | Responsibility                                |
| --- | -------------- | ---- | --------------------------------------------- |
| A39 | Alert Arborist | R    | Alert catalog→PrometheusRules; noise ↓        |
| A40 | Runbook Editor | R    | Runbook quality lint, drills, MTTA/MTTR goals |
| A41 | Comms Bard     | R    | Release/incident comms, audience targeting    |
| A42 | Docs Librarian | R    | Repo docs, READMEs, diagrams, ADRs            |

### Quality & UX

| ID  | Agent                   | Role | Responsibility                                 |
| --- | ----------------------- | ---- | ---------------------------------------------- |
| A43 | QE Generalist           | R    | Acceptance suite, parity checks, smoke paths   |
| A44 | Visual/Accessibility QE | R    | Playwright visual tests, a11y (WCAG), PDF tags |
| A45 | Mobile/Edge QE          | R    | Network flake tests, backoff, cache behavior   |

### Governance & Finances

| ID  | Agent           | Role | Responsibility                             |
| --- | --------------- | ---- | ------------------------------------------ |
| A46 | CAB Secretary   | C    | Approvals, exceptions, decisions log       |
| A47 | FinReporter     | R    | Cost deltas per release, budgets adherence |
| A48 | Vendor Sentinel | C    | Limits/rate-caps on external deps, SLAs    |

### SecOps/Red–Blue

| ID  | Agent              | Role | Responsibility                           |
| --- | ------------------ | ---- | ---------------------------------------- |
| A49 | Red Team Sprinter  | R    | Quick adversarial checks (secrets, SSRF) |
| A50 | Blue Team Sentinel | R    | Detections verify, authz denies sanity   |

### Developer Experience

| ID  | Agent             | Role | Responsibility                           |
| --- | ----------------- | ---- | ---------------------------------------- |
| A51 | Template Keeper   | R    | Dockerfile/Helm/CI golden templates      |
| A52 | Lint Marshal      | R    | Code/infra linting, conventional commits |
| A53 | Preview Concierge | R    | URLs, TTL, wake/sleep, PR comments       |

### Reliability Economics

| ID  | Agent               | Role | Responsibility                                         |
| --- | ------------------- | ---- | ------------------------------------------------------ |
| A54 | SLO Economist       | C    | Budget allocations, burn-down, priority tradeoffs      |
| A55 | Feature Flag Butler | R    | Catalog hygiene, expiry, auto-ramp, kill-switch drills |

### Data Governance

| ID  | Agent          | Role | Responsibility                            |
| --- | -------------- | ---- | ----------------------------------------- |
| A56 | Purge Marshall | R    | Dual-control purge/retention, legal holds |
| A57 | PII Scrubber   | R    | Logs/metrics/templates redaction & checks |

### Toolchain Safety

| ID  | Agent              | Role | Responsibility                                    |
| --- | ------------------ | ---- | ------------------------------------------------- |
| A58 | Secrets Escrow     | R    | Key rotation, storage proofs, access attestations |
| A59 | Provenance Sheriff | R    | Attestations linked end-to-end, Rekor audits      |
| A60 | Evidence QA        | R    | Manifest integrity, reproducibility checks        |

### Communication & Stakeholder

| ID  | Agent                | Role | Responsibility                                                         |
| --- | -------------------- | ---- | ---------------------------------------------------------------------- |
| A61 | Stakeholder Liaison  | R    | Cross-functional updates, weekly GA readiness reviews, exec briefings  |
| A62 | Narrative Strategist | R    | Internal newsletters, investor updates, external blog posts            |
| A63 | Launch Herald        | R    | Bold GA/MVP-3 announcements positioning Summit as safe, trustworthy AI |

---

## 5) Phases, Gates, Deliverables (deepened)

### P0 Readiness (A5,A6,A8,A15,A52,A51)

**Deliver:**

- Required checks
- Hardened containers
- Size budgets
- Verify-at-deploy
- Templates applied

**Gate:** `supply_chain=pass`, `policy_ci=pass`, `hardening=pass`

### P1 Baselines & Previews (A11,A12,A13,A7,A53,A26,A27)

**Deliver:**

- Golden paths running
- Preview TTL/budgets
- Perf baseline & headroom JSON
- Dashboards

**Gate:** `slo=pass`, `perf=pass`, `preview_budget=pass`

### P2 Data Safety (A21,A22,A23,A24,A25)

**Deliver:**

- Migration plans
- Backfill runs
- Parity diffs
- Rollback SQL
- RLS
- pgBouncer
- Slow-query lints

**Gate:** `migrations=pass`, `tenant_isolation=pass`

### P3 Security & Compliance (A18,A19,A15,A16,A17,A58)

**Deliver:**

- OIDC/WebAuthn/SCIM smoke
- OPA obligations
- Audit chain proofs
- Secrets/key rotation

**Gate:** `identity=pass`, `authz=pass`, `audit=pass`

### P4 Product GA Tracks (A30–A34)

**Deliver:**

- Realtime WS/SSE resume
- Deterministic signed PDFs
- Typesense GA
- Ingest backpressure/DLQ/replayctl

**Gate:** `product_slos=pass`, `reindex_parity=pass`, `ingest_lag<60s`

### P5 DR/Chaos (A35,A36,A37,A38)

**Deliver:**

- DR failover/cutback evidence
- Chaos with auto-rollback ≤5m
- Incident drills

**Gate:** `dr=pass`, `chaos=pass`

### P6 Release Train (A1,A2,A3,A41,A60)

**Deliver:**

- `release/vX.Y.Z-rc.N`
- Stage canary
- Prod 10→50→100
- Notes
- evidence.zip

**Gate:** `all_required_gates=pass`, tag & evidence signed

### P7 Alerts/Runbooks/Docs (A39,A40,A42)

**Deliver:**

- 100% Sev1/2 coverage
- Noise ↓ ≥40%
- Drills
- Doc set complete

**Gate:** `alert_hygiene=pass`, `doc_lint=pass`

### P8 GA Flip & KPI (A1,A43,A54,A47)

**Deliver:**

- GA flags flip
- +24h KPI deltas
- Regression tickets

---

## 6) Task Graph (DAG — condensed)

```
P0 → P1 → (P2 || P3) → P4 → P5 → P6 → P7 → P8
```

**Dependencies:**

- P2 depends on P1
- P3 depends on P0
- P4 depends on P2+P3
- P5 depends on P4

---

## 7) Promotion/Rollback API (v2)

### PROMOTE

```json
{
  "version": "{{TARGET_VERSION}}",
  "canary": [10, 50, 100],
  "required_gates": ["slo", "perf", "supply_chain", "migrations", "policy", "dr"],
  "auto_ramp_flags": true,
  "abort_on": {
    "slo": "burn>0",
    "perf": "headroom<0.20",
    "supply_chain": "attest/sign missing"
  },
  "trace_id": "..."
}
```

### ROLLBACK

```json
{
  "version": "{{TARGET_VERSION}}",
  "reason": "gate_fail|slo_breach|kpi_regression",
  "trace_id": "..."
}
```

**Promote only if:**

- All gates **pass**
- Headroom ≥ `{{HEADROOM_TARGET}}`
- DR freshness OK
- Exceptions zero/approved

---

## 8) Hard Stop & Escalation

- Critical security/data/SLO breach → **HALT → ROLLBACK** → open incident → attach evidence → notify ONCALL & CAB → schedule fix train.

---

## 9) Orchestration Calendar (T-14 → T+1)

| Day  | Phase | Activities                                        |
| ---- | ----- | ------------------------------------------------- |
| T-14 | P0/P1 | Checks, probes, perf baseline, preview governance |
| T-10 | P2    | Migrations demo, RLS/pgBouncer                    |
| T-7  | P3    | Identity+authz+audit proofs                       |
| T-5  | P4    | Soak 48h                                          |
| T-3  | P5    | DR/chaos drills                                   |
| T-1  | —     | Freeze critical paths; stage `rc`                 |
| T-0  | P6    | Promote 10→50→100; flip GA flags                  |
| T+1  | P8    | KPI compare & regressions tickets                 |

---

## 10) Evidence Pack Manifest (inside `evidence.zip`)

```json
{
  "version": "{{TARGET_VERSION}}",
  "commit_range": {
    "from": "sha",
    "to": "sha"
  },
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
  "hashes": {
    "evidence.zip": "sha256:..."
  },
  "rekor_uuid": "...",
  "signed_by": "cosign-identity@org"
}
```

---

## 11) Expanded Gate Verdict (attach to RESPONSE.verdicts)

```json
{
  "gate": "slo",
  "env": "stage",
  "verdict": "pass",
  "metrics": {
    "p95_ms": 127,
    "error_rate": 0.004,
    "burn": "0"
  },
  "thresholds": {
    "p95_ms": "<=150",
    "error_rate": "<0.01",
    "burn": "==0"
  },
  "evidence": [
    {
      "path": "slo/stage_{{sha}}.png",
      "sha256": "...",
      "sig": "..."
    }
  ]
}
```

---

## 12) Risk Register (top templates)

```yaml
- id: R-SCHEMA-CUTOVER
  owner: "@schema"
  likelihood: medium
  impact: high
  mitigations:
    - "shadow parity >= 99.5%"
    - "dual-write"
    - "rollback SQL tested"
    - "contract 7d later"
  triggers:
    - "db_query_latency_p95 > 300ms for 5m"
  rollback: "revert image digest, disable flag, run backout SQL"

- id: R-REALTIME-LAG
  owner: "@realtime"
  mitigations:
    - "QoS degrade"
    - "resume checkpoint"
    - "coalesce diffs"
  triggers:
    - "rt_delivery_lag_p95 > 800ms for 10m"
```

---

## 13) Communication Macros (auto-posted)

| Event      | Message Template                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Start**  | "Cutting `{{TARGET_VERSION}}` — stage canary. Gates: SLO/Perf/SupplyChain/Migrations/Policy/DR. Evidence to follow. On-call: {{ONCALL}}." |
| **Breach** | "Canary breach at **{{step}}%** — **auto-rollback**. Gate: {{gate}}. Evidence + traces attached."                                         |
| **GA**     | "**{{TARGET_VERSION}}** at 100%. GA flags flipped: {{GA_FLAGS}}. Evidence attached; +24h KPI scheduled."                                  |

---

## 14) One-Click Kickoff (Conductor's ordered RPCs)

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

| Skills              | Agents           |
| ------------------- | ---------------- |
| helm, terraform     | A6, A5, A35, A36 |
| rego/opa            | A9, A19, A39     |
| cosign/in-toto      | A15, A3, A59     |
| k6                  | A26, A11         |
| playwright          | A31, A44         |
| typesense           | A32, A22         |
| kafka/redis streams | A30, A33         |
| pg/neo4j/redis      | A22, A21         |
| grafana/prometheus  | A13, A39         |
| security scanners   | A16, A15         |

---

## 16) Label & Template Canon

### Labels

```
type:feat|fix|ops|security
risk:low|med|high
migration
drill
chaos
perf
supply-chain
policy
ga
hotfix
```

### PR Template Sections

1. **Impact**
2. **Gates affected**
3. **Canary plan**
4. **Rollback**
5. **Runbooks**
6. **Evidence paths**
7. **Risk & owner**

---

## 17) Acceptance Suite (QE A43/A44)

- **Green paths** under canary steps
- **Perf gate** validation
- **AuthZ obligations** verification
- **Redaction proof** (no OCR leakage)
- **Realtime resume** correctness
- **Search reindex** zero downtime
- **Ingest replay** idempotent
- **DR/Chaos drills** met RTO/RPO and ≤5m rollback
- **Alert hygiene** 100% Sev1/2 coverage; noise ↓ ≥40%
- **Evidence** verified (hashes + signatures + Rekor)

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

Return Agent RPC v2 response with:
- artifacts (path+sha256+sig)
- links (PRs, runs, dashboards)
- verdicts (gates)
- notes
- next
- trace_id

Emit OTEL spans + JSON logs with release/env/tenant/trace_id/sha.
```

---

## 19) "Ultra" Add-Ons (enable if you want _even more_)

| Add-On                    | Description                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| **DORA Metrics Agent**    | Collects lead time/deployment freq/MTTR/change failure rate; adds to evidence |
| **Feature-to-SLO Mapper** | Ties flags to SLO deltas and business KPIs                                    |
| **ADR Arbiter**           | Auto-opens Architecture Decision Records for risky changes                    |
| **Benchmarker**           | Compares headroom & cost vs last 3 releases                                   |
| **Auto-Tutor**            | Generates play-by-play training snippets from evidence for new on-callers     |

---

## 20) Final Go/No-Go Checklist (Conductor must compute)

```json
{
  "version": "{{TARGET_VERSION}}",
  "gates": {
    "slo": "pass",
    "perf": "pass",
    "supply_chain": "pass",
    "migrations": "pass",
    "policy": "pass",
    "dr": "pass"
  },
  "headroom": {
    "web": 0.31,
    "api": 0.27
  },
  "exceptions": [],
  "risk_open": [],
  "drill_recent": true,
  "evidence_signed": true
}
```

---

## Appendix: Quick Reference Commands

### Run Full Orchestration

```bash
# Initialize the release conductor
pnpm release-conductor init --version={{TARGET_VERSION}}

# Validate all prerequisites
pnpm release-conductor validate --phase=P0

# Execute phase with evidence
pnpm release-conductor run --phase=P1 --evidence

# Promote to next stage
pnpm release-conductor promote --canary=10

# Emergency rollback
pnpm release-conductor rollback --reason=slo_breach
```

### Evidence Generation

```bash
# Generate evidence pack
pnpm release-conductor evidence pack

# Sign evidence
pnpm release-conductor evidence sign --key=cosign.key

# Verify evidence
pnpm release-conductor evidence verify --rekor
```

---

**End — v4 ULTRA orchestration prompt.**

If you want, I can now tailor this to your current repo state (map agents→actual services, prefill paths/checks/artifacts) or generate the initial **Conductor kick-messages** for each agent to start P0 immediately.
