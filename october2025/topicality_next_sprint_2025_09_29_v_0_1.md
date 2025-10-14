# Topicality · Next Sprint Plan — **2025‑09‑29 → 2025‑10‑13**  
**Slug:** `topicality-sprint-2025-09-29-v0-1`  
**Version:** v0.1.0  
**Repo snapshot reviewed:** `summit-main (zip)` — **52,387** files; **233** top‑level dirs; **146** GitHub Actions workflows; **31** READMEs; notable packs: `.maestro/changes/*`, `prov-ledger/*` (RC1 salvage), `summit_policy_release_pack/*`, `intelgraph/*`, `client/*`, `terraform/*`, `helm/*`.  
**Context artifacts referenced:** `.maestro/changes/20250915-*` (Prov‑Ledger beta; copilot hardening; connectors), `BUG_BASH_REPORT_20250922.md` (GREEN TRAIN stabilization).  

> **Decision‑first:** This sprint converts Prov‑Ledger beta + Copilot NL→Cypher hardening + 5 priority connectors + SLO/Cost guardrails into production‑grade slices with disclosure‑first exports, tied to measurable KPIs and a canaryable release gate.

---

## 0) Table of Contents
1. [Executive Summary & Goals](#1-executive-summary--goals)
2. [In‑Depth Review (What we have / risks)](#2-in-depth-review-what-we-have--risks)
3. [Sprint Objectives → KPIs → Acceptance](#3-sprint-objectives--kpis--acceptance)
4. [Swimlanes & Work Breakdown](#4-swimlanes--work-breakdown)
5. [Backlog (prioritized)](#5-backlog-prioritized)
6. [Maestro ChangeSpec (scaffold)](#6-maestro-changespec-scaffold)
7. [Release Gate & Canary Policy](#7-release-gate--canary-policy)
8. [Governance: OPA ABAC + Disclosure Pack](#8-governance-opa-abac--disclosure-pack)
9. [Runbooks & Demos](#9-runbooks--demos)
10. [Risk Heatmap & Unblocks](#10-risk-heatmap--unblocks)
11. [Calendar & Rituals](#11-calendar--rituals)
12. [Appendix: Issue templates & CI hooks](#12-appendix-issue-templates--ci-hooks)

---

## 1) Executive Summary & Goals
**Why now:** Prior change specs (2025‑09‑15 window) set intent for Prov‑Ledger beta, NL→Cypher validity ≥95%, connector certification, and SLO dashboards. Bug bash (2025‑09‑22) indicates stabilization needs and observability gaps. This sprint lands those **as provable releases**: disclosure‑first exports, policy‑enforced rollouts, and COPILOT validity instrumentation.

**Sprint Goal (single sentence):**
> Ship a **verifiable export + claim ledger slice** and **NL→Cypher Copilot v1 hardening** alongside **5 certified connectors**, with **SLO/Cost guardrails** and a **canaryable release**, evidenced by manifests and automated attestations.

**Timebox:** 2 weeks (2025‑09‑29 → 2025‑10‑13), demo on 2025‑10‑11, code freeze 2025‑10‑12 EOD.

**Owners (by lane):**
- **Product/PM:** Maya K.  
- **Prov‑Ledger/API:** Alex T.  
- **Copilot (apps/web + server):** Nina V.  
- **Connectors:** Omar R.  
- **Ops/SRE/Obs:** Priya S.  
- **Governance/Compliance:** Jordan P.  
- **GTM/Design Partners:** Sam D.  

---

## 2) In‑Depth Review (What we have / risks)
### Architecture & repos observed
- **IntelGraph Platform:** full‑stack (React 18, Node 20+, GraphQL) with analytics (NER, embeddings, GEOINT, cross‑modal matching), quickstart scripts, health surfaces.
- **Prov‑Ledger (RC1 salvage present):** app (claims, evidence, scoring, security) + infra (docker‑compose, Helm) + tests. Needs current wiring to apps/web export flow and manifest verifier.
- **.maestro/changes/**: multiple change specs including *prov‑ledger‑beta*, *copilot‑hardening*, *connectors*, *ops/SLO*. This provides a strong template we’ll instantiate for this sprint.
- **GH Actions (146 workflows):** reusable CI, release, auto‑rollback, SBOM/attest, ABAC policy, batch merge. Strong foundation for gated release and provenance.
- **Packs:** `summit_policy_release_pack`, `summit_release_env_pack`, Helm/Terraform modules → enable deployment & policy baselines.
- **Bug Bash 2025‑09‑22:** GREEN TRAIN stabilization; P0/P1 items noted; emphasis on monitoring gaps and canary fixes.

### Strengths
- **Disclosure‑first posture** already present (SBOM/attest workflows, policy packs).  
- **ChangeSpec discipline** in `.maestro`.  
- **Runbooks (R1‑R6)** baseline for demoable value.

### Gaps / Risks (to be burned down this sprint)
1. **Export provenance:** No end‑to‑end *verifiable manifest* attached in UI flow.
2. **Copilot validity:** NL→Cypher syntactic/semantic guardrails & pre‑exec validation not consistently enforced; missing cost/row preview.
3. **Connector certification:** Golden I/O tests + rate‑limit/policy configs inconsistent per connector.
4. **Observability:** SLO dashboards incomplete; cost guardrails (per‑request budget) not enforced across services.
5. **Rollout discipline:** Canary policy exists in workflows, but missing per‑service thresholds wired to SLOs.

---

## 3) Sprint Objectives → KPIs → Acceptance
### Objective A — **Prov‑Ledger v0.1 (beta)**
- **KPIs:**  
  - Export manifest verification pass‑rate: **≥ 99%** across demo datasets.  
  - External verifier CLI completes in **< 2s** for 95th percentile export.  
- **Acceptance:** UI export attaches manifest; `/export/prov` & `/claims/*` behind auth with `/healthz|/readyz|/metrics`; CI probe coverage ≥ 90% of endpoints.

### Objective B — **Copilot NL→Cypher Hardening**
- **KPIs:**  
  - NL→Cypher syntactic validity **≥ 95%** on curated prompts set (≥ 200 cases).  
  - Sandbox pre‑exec diff & **cost/row estimate** shown for 100% of execs; blocked on risk thresholds.
- **Acceptance:** Pre‑exec validator blocks unsafe ops; regression suite green; latency p95 ≤ **300 ms** for preview.

### Objective C — **Connector Certification (5x)**
- **KPIs:**  
  - 5 connectors (e.g., Slack, Gmail, Drive, Jira, GitHub) certified with **golden I/O tests**, **manifest+mappings**, **rate‑limit policy**.  
- **Acceptance:** Each connector has `fixtures/`, `mapping.yaml`, `policy.yaml`, `golden/*.json`, CI job `connector-cert` green.

### Objective D — **SLO/Cost Guardrails + Canary**
- **KPIs:**  
  - Service SLO dashboards live; canary aborts auto‑rollback on breach in **≤ 2 windows**.  
  - Per‑request cost budget enforced (header or token‑bucket) across Copilot/Graph API.
- **Acceptance:** Release gate checklist complete; rollback drill executed in staging.

---

## 4) Swimlanes & Work Breakdown
> **Definition of Done (DoD):** Code + tests + docs + **Disclosure Pack** (SBOM, SLSA, risk memo, rollback plan) + dashboards + owners assigned.

### 4.1 Prov‑Ledger/API (Owner: Alex T.)
- Implement **export manifest** (hash tree + transform chain).  
- Build **external verifier CLI**; integrate into CI.
- Secure endpoints; add `/healthz`, `/readyz`, `/metrics`.
- Wire **apps/web** export flow to attach manifest; surface validation result.

**Acceptance tests:**
- `make prov-ledger:verify fixtures/sample_export.json` returns 0.  
- `gh workflow run attest-provenance.yml` passes; UI shows green "Verified Manifest" badge.

### 4.2 Copilot Hardening (Owner: Nina V.)
- Add **prompt→Cypher preview** with **cost/row estimates**.  
- **Sandbox executor** + pre‑exec diff; block unsafe queries.  
- Curate **200‑case prompt set**; track validity metric; add regression tests.  

**Acceptance tests:**
- `npm run test:copilot-validity` ≥ 95% validity; preview p95 ≤ 300 ms.

### 4.3 Connectors (Owner: Omar R.)
- Certify **Slack, Gmail, Drive, Jira, GitHub**.  
- For each: `mapping.yaml`, `policy.yaml` (rate limits, scopes), `golden/*.json`, `fixtures/`, CI job added.

**Acceptance tests:**
- `make connector-cert-{name}` → green; schema checks pass; error budget policy applied.

### 4.4 Ops/SRE/Observability (Owner: Priya S.)
- SLO dashboards (latency, error rate, cost/req).  
- **Auto‑rollback** thresholds set per service; dry‑run.
- Cost guardrails: per‑request budget header honored across services.

**Acceptance tests:**
- Canary drill triggers rollback on induced SLO breach in staging; dashboards show event.

### 4.5 Governance/Compliance (Owner: Jordan P.)
- **Disclosure Pack v1** template finalized; auto‑attached to releases.  
- OPA ABAC policy bundle updated; violations auto‑block.

**Acceptance tests:**
- Release PRs show **SBOM + SLSA** attestations; policy audit zero criticals.

### 4.6 GTM/Design Partners (Owner: Sam D.)
- Schedule 2 **design partner** demos; define **ROI measures** and success criteria.  
- Collect 5 **NL→Cypher prompts** per partner for regression set.

**Acceptance tests:**
- Demo sign‑offs captured; partner prompts added to regression corpus.

---

## 5) Backlog (prioritized)
- **SPR‑A1:** Export manifest (hash tree + transform chain) — *Prov‑Ledger*  
- **SPR‑A2:** External verifier CLI + CI probe — *Prov‑Ledger*  
- **SPR‑A3:** UI export attaches manifest + badge — *Apps/Web*  
- **SPR‑B1:** Cost/row estimates + sandbox diff — *Copilot*  
- **SPR‑B2:** 200‑case prompt set + validity metric — *Copilot*  
- **SPR‑C1..C5:** Connector certification (Slack, Gmail, Drive, Jira, GitHub) — *Connectors*  
- **SPR‑D1:** SLO dashboards + alerts — *Ops*  
- **SPR‑D2:** Canary thresholds + rollback drill — *Ops*  
- **SPR‑E1:** Disclosure Pack v1 + auto‑attach — *Gov*  
- **SPR‑E2:** OPA ABAC policy updates + CI — *Gov*  

---

## 6) Maestro ChangeSpec (scaffold)
```yaml
# .maestro/changes/20250929-sprint-prov-ledger-copilot-connectors.yaml
area: multi  # prov-ledger, apps/web, connectors, ops, governance
intent: release
release_tag: v0.1.0-rc2
window:
  start: 2025-09-29
  end:   2025-10-13
objective: >
  Ship Prov-Ledger beta (verifiable exports), Copilot NL→Cypher validity ≥95%,
  certify 5 connectors with golden IO tests, and land SLO/cost guardrails + canary.

owners:
  product: maya.k
  prov_ledger: alex.t
  copilot: nina.v
  connectors: omar.r
  ops: priya.s
  governance: jordan.p
  gtm: sam.d

kpis:
  - name: export_manifest_verification_rate
    target: '>=0.99'
  - name: nl2cypher_syntax_validity
    target: '>=0.95'
  - name: preview_latency_p95_ms
    target: '<=300'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2000

freeze_windows:
  - { start: '2025-10-12T00:00:00Z', end: '2025-10-13T23:59:00Z', reason: 'pre-release freeze' }

work_items:
  - epic: Provenance & Claim Ledger (beta)
    stories:
      - Implement export manifest + transform chain
      - External verifier CLI + CI job `prov-ledger-verify`
      - UI export attaches manifest + verifier badge
    acceptance:
      - Manifest verified in CI and UI; endpoints expose health/metrics

  - epic: NL→Cypher Copilot hardening
    stories:
      - Cost/row estimate + sandbox pre-exec diff
      - Curate 200-case prompt set; track validity
    acceptance:
      - Validity ≥95%; preview p95 ≤300ms; unsafe ops blocked

  - epic: Connector certification
    stories:
      - Slack, Gmail, Drive, Jira, GitHub with mapping/policy/golden tests
    acceptance:
      - `connector-cert-*` green; rate limits enforced

  - epic: Ops/SRE
    stories:
      - SLO dashboards + canary thresholds + rollback drill
    acceptance:
      - Induced breach auto-rolls back in staging

  - epic: Governance
    stories:
      - Disclosure Pack v1 + OPA ABAC bundle update
    acceptance:
      - SBOM+SLSA+Risk memo attached on release; policy audit zero criticals

artifacts:
  - type: disclosure_pack
    path: .evidence/releases/${release_tag}/
  - type: dashboards
    path: observability/dashboards/
  - type: connectors
    path: connectors/*/

checks:
  - name: gate-sbom
    run: gh workflow run attest-sbom.yml
  - name: gate-slsa
    run: gh workflow run attest-provenance.yml
  - name: policy-abac
    run: gh workflow run abac-policy.yml
```

---

## 7) Release Gate & Canary Policy
```yaml
# .github/workflows/release-gate.yml (excerpt)
name: Release Gate
on: [workflow_dispatch]
jobs:
  gate:
    uses: ./.github/workflows/_reusable-release.yml
    with:
      require_slsa: true
      require_sbom: true
      run_risk_assessment: true
      dpa_dpia_required: false
      rollback_plan_required: true
      canary_slice: '10%'
      success_criteria: |
        error_rate<=1%
        latency_p95_ms<=300
        cost_per_req_usd<=0.01
```

```yaml
# canary thresholds (Helm values or Argo Rollouts annotations)
rollouts.argoproj.io/analysis: |
  metrics:
    - name: error-rate
      threshold: 0.01
    - name: latency-p95
      threshold: 300
    - name: cost-per-req
      threshold: 0.01
  rollbackOnFailure: true
```

---

## 8) Governance: OPA ABAC + Disclosure Pack
```rego
# policy/abac.rego (excerpt)
package access

import future.keywords.if

default allow = false

allow if {
  input.user.mfa == true
  input.request.purpose in {"demo","ops","support"}
  not sensitive_violation
}

sensitive_violation if {
  input.resource.sensitivity == "high"
  not input.user.step_up_auth
}
```

```bash
# Disclosure Pack v1 — structure
.evidence/
  releases/${TAG}/
    sbom.json
    slsa-provenance.intoto.jsonl
    risk_assessment.md
    rollback_plan.md
    manifest.hash-tree.json
    decision_memo.md
```

---

## 9) Runbooks & Demos
- **R2: Phishing Cluster Discovery (R2)** — productionize with manifest‑verified exports and Copilot previews.  
- **Demo script:**  
  1) Import dataset → 2) Run R2 → 3) Inspect entities/relationships → 4) Use Copilot (preview shows query + cost/row) → 5) Export w/ manifest → 6) Verify in UI (green badge) → 7) Show SLO dashboard → 8) Induce canary abort in staging and auto‑rollback.

**Demo acceptance:** One‑take demo under 8 minutes; all green checks; disclosure pack attached to tag.

---

## 10) Risk Heatmap & Unblocks
| Risk | Prob. | Impact | Owner | Mitigation |
|---|---:|---:|---|---|
| Export manifest complexity | M | H | Alex | Start with minimal hash tree; iterate; add fixtures early |
| NL→Cypher validity gap | M | H | Nina | Lock 200‑case set day 2; daily metric visible |
| Connector API rate limits | M | M | Omar | Policy.yaml + backoff; golden tests |
| SLO dashboards flakiness | M | M | Priya | Use synthetic checks and replay data |
| Policy false positives | L | M | Jordan | Shadow mode first; tighten rules |

**Unblocks:**  
- Provide sample datasets; allocate CI minutes; grant staging access; confirm demo dates with partners.

---

## 11) Calendar & Rituals
**Cadence (America/Denver):**
- **Daily Standup (15m):** 09:30 MT — owners report KPI deltas; blockers; next 24h.  
- **Spike Review:** 2025‑10‑02 — Copilot validity + manifest design.  
- **Mid‑sprint Demo:** 2025‑10‑06 — end‑to‑end demo dry‑run.  
- **Release Drill:** 2025‑10‑11 — canary + rollback.  
- **Freeze:** 2025‑10‑12 EOD.  
- **Sprint Demo:** 2025‑10‑11 (partners) / 2025‑10‑13 (internal close).

**Standup template**
```text
Yesterday → Today → Blockers → KPI delta → Risk
```

---

## 12) Appendix: Issue templates & CI hooks
```yaml
# .github/ISSUE_TEMPLATE/sprint_story.yml
name: Sprint Story
body:
  - type: input
    id: id
    attributes: { label: Story ID, placeholder: SPR-A1 }
  - type: textarea
    id: acceptance
    attributes: { label: Acceptance Criteria }
  - type: checkboxes
    id: dod
    attributes:
      label: DoD
      options:
        - label: Tests
        - label: Docs
        - label: Disclosure Pack
        - label: Dashboards
        - label: Owner assigned
```

```yaml
# .github/workflows/connector-cert.yml (excerpt)
name: connector-cert
on:
  push:
    paths: ["connectors/**"]
jobs:
  cert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run golden IO tests
        run: make connector-cert-all
```

```bash
# Makefile snippets
connector-cert-all: connector-cert-slack connector-cert-gmail connector-cert-drive connector-cert-jira connector-cert-github

prov-ledger-verify:
	python3 tools/prov_ledger_verify.py fixtures/sample_export.json

copilot-validity:
	npm run test:copilot-validity
```

---

### Attribution & Notes
- This plan consolidates observed change specs (2025‑09‑15 series), bug bash notes (2025‑09‑22), and repo layout at review time.  
- All releases must include **Disclosure Pack** + **policy attestation** + **rollback plan**.

**END OF PLAN**

