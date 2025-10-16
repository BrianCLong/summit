# Council v1 — 1‑Pager Roadmap & Acceptance‑Test Checklist (GA Core)

_Updated: August 20, 2025_

---

## North Star (Single Use‑Case Walkthrough)

**Goal:** Deliver an auditable, policy‑by‑default thin slice from **Intake → Entity Resolution → Link Analysis → Courses of Action (COA) → Brief** using one canned dataset.

**Guardrails:** Mission‑first/ethics‑always; Provenance Before Prediction; ABAC/RBAC + OPA policy enforcement; auditability & explainability by design.

---

## Scope

**GA Core (Day‑1 capabilities)**

- Ingest: Files (CSV/JSON), email/MSG export, web capture, manual notes.
- Graph Core: ER (dedupe, resolve, temporal), typed relations, timebounds.
- Analytics: Link/ego, pattern queries, simple risk flags; hypothesis logging.
- Copilot (Auditable): “Explain this view,” “What changed?”, “Cite sources,” refusal when policy denies.
- Governance: ABAC/RBAC, policy‑by‑default (OPA), audit trail, data minimization.
- Reporting: One‑click brief (tri‑pane snapshots + citations).

**Out‑of‑Scope (won’t build for GA)**

- Offensive tooling, predictive targeting, mass scraping, auto‑actioning.
- Advanced simulations, border‑scope overlays, expedition kits (Phase‑2).

---

## Six‑Week Thin‑Slice Plan (Time‑boxed)

**Week 1 – Skeleton & Policy Default**

- Repo, CI/CD, envs; baseline OPA policies; ABAC model; seed dataset; acceptance criteria map.
  **Week 2 – Intake & Provenance**
- File/notes connectors; provenance manifest (source, hash, handler); lineage events.
  **Week 3 – Graph & Entity Resolution**
- ER pipeline (blocking & fuzzy); temporal model; CRUD APIs; sample queries.
  **Week 4 – Analytics & Explainability**
- Link/ego queries; pattern templates; “Explain this” (trace back to entities/edges/sources).
  **Week 5 – Copilot Guardrails & Audit**
- Guardrailed prompts; refusal & policy‑denial surfaces; audit log, slow‑query killer.
  **Week 6 – End‑to‑End Demo & Hardening**
- North‑Star flow; p95 latency/SLOs; security review; runbook drills; ship GA Core.

---

## Milestones & Exit Criteria

**M1 (W2):** Ingest writes provenance manifests; policy‑by‑default blocks unclassified reads.
**M2 (W3):** ER merges duplicates with ROC AUC ≥ 0.90 on test set; temporal queries return correct intervals.
**M3 (W4):** “Explain this view” returns top‑N entities/edges + citations within 2s (p95).
**M4 (W5):** Copilot refuses on policy violations with human‑readable cause; every UI action leaves audit breadcrumbs.
**M5 (W6):** End‑to‑end demo passes checklist with ≥95% green checks; security review signed; runbooks tested.

---

## Roles & RACI (GA Core)

- **PM/Chair:** Scope, prioritization, stakeholder comms. _(A/R)_
- **Tech Lead:** Architecture, performance, security. _(A/R)_
- **Policy/GRC:** ABAC/RBAC model, OPA rules, audits. _(R)_
- **Data/Graph:** ER, schema, lineage. _(R)_
- **UX/Research:** Tri‑pane, explainability UX, report. _(R)_
- **DevOps:** CI/CD, secrets, monitoring, SLOs. _(R)_
- **Advisor Panel:** Ethics, red‑lines, test witness. _(C/I)_

---

## Metrics & SLOs (GA)

- **p95 query latency:** ≤ 1500 ms (read); ≤ 2500 ms (ER write).
- **Audit coverage:** ≥ 99% of privileged actions logged with actor, policy, rationale.
- **Explainability hit‑rate:** ≥ 95% of UI states produce an explanation with citations.
- **Policy denials:** 100% show user‑readable reason + next step.
- **Uptime (GA Core):** 99.5% (single‑region), disaster‑recovery RTO ≤ 4h (offline kit out‑of‑scope).

---

## Seat ↔ Epic Crosswalk (sample)

| Seat / Role      | Top Need                      | Epic ID                 | Success Metric               | Demo Artifact                 | Owner       |
| ---------------- | ----------------------------- | ----------------------- | ---------------------------- | ----------------------------- | ----------- |
| Analyst          | Resolve people/orgs over time | **E‑01 ER & Temporal**  | AUC ≥ 0.90; <2% false merges | Merge review pane + ROC chart | Data/Graph  |
| Case Lead        | Trace sources for every claim | **G‑02 Provenance**     | 100% claims cite source IDs  | “Explain this view” panel     | UX/Research |
| Governance/Audit | Deny by default & show why    | **P‑01 Policy Default** | 100% denial reasoned         | Policy toast + audit card     | Policy/GRC  |
| Brief Writer     | One‑click report              | **R‑01 Reporting**      | ≤ 60s to export brief        | PDF/HTML brief w/ figures     | PM/UX       |
| Ops/SRE          | Kill pathological queries     | **O‑01 Observability**  | ≤ 1 min to kill; alert fired | Slow‑query drill log          | DevOps      |

---

# Acceptance‑Test Checklist (Traceable)

**Legend:** [ ] open, [x] pass, [~] partial

### A. Policy & Access (POL)

- [ ] **POL‑DEF‑01:** New workspace defaults to **deny** for unauth roles; ABAC grants required to view.
- [ ] **POL‑EXPL‑02:** On denial, user sees policy name, rule snippet, and “request access” path.
- [ ] **POL‑SIM‑03:** Policy simulator predicts allow/deny outcomes for sample users before deploy.
- [ ] **POL‑AUD‑04:** Every allow/deny decision stamped in audit with subject, object, policy, reason.

### B. Provenance & Lineage (PROV)

- [ ] **PROV‑MAN‑01:** Ingest creates a signed manifest (source, hash, handler, timestamp).
- [ ] **PROV‑TRACE‑02:** Any node/edge can list back its source artifacts and handlers.
- [ ] **PROV‑UI‑03:** Hover on a chart datapoint reveals underlying sources (IDs, types).

### C. Entity Resolution & Graph (ER)

- [ ] **ER‑MET‑01:** Validation set yields ROC AUC ≥ 0.90; precision@k ≥ 0.95 for merges.
- [ ] **ER‑REV‑02:** Analyst can accept/reject suggested merges; actions are reversible (lineage preserved).
- [ ] **ER‑TEMP‑03:** Temporal queries respect validity intervals; point‑in‑time view renders accurately.

### D. Analytics & COA (ANL)

- [ ] **ANL‑PAT‑01:** Pattern templates (e.g., 2‑hop ego, suspicious triads) return expected matches.
- [ ] **ANL‑EXPL‑02:** “Explain this” lists contributing edges/entities + sources within 2s (p95).
- [ ] **ANL‑HYP‑03:** Hypothesis workspace logs assumptions, evidences, and confidence scores.

### E. Copilot (AUD‑AI)

- [ ] **AI‑SRC‑01:** Answers include citations to specific sources or explain absence.
- [ ] **AI‑REF‑02:** Copilot refuses tasks that breach policy and states cause in plain language.
- [ ] **AI‑SCOPE‑03:** Copilot does not hallucinate non‑ingested sources (tested with traps).

### F. Audit & Observability (OBS)

- [ ] **OBS‑BRD‑01:** All privileged UI actions produce audit breadcrumbs (actor, action, object, policy).
- [ ] **OBS‑SQK‑02:** Slow‑query killer trips at threshold, aborts, and logs diagnostic context.
- [ ] **OBS‑ALR‑03:** On policy‑denial spikes, alert fires to on‑call with top offending rules.

### G. Performance & Reliability (PERF)

- [ ] **PERF‑QRY‑01:** p95 read ≤ 1500 ms on dataset N; p95 write ≤ 2500 ms.
- [ ] **PERF‑CON‑02:** Concurrency test at 50 active users maintains SLOs.
- [ ] **PERF‑BKP‑03:** Backup/restore validated; RTO ≤ 4h achieved in drill.

### H. Security & Offline (SEC)

- [ ] **SEC‑AUTH‑01:** FIDO2/WebAuthn login for admins; MFA enforced for all.
- [ ] **SEC‑MIN‑02:** Data minimization policy verified; sensitive fields hidden by default.
- [ ] **SEC‑TLS‑03:** All traffic TLS; secrets rotated; SBOM generated per build.

### I. UX & Reporting (UX)

- [ ] **UX‑FLOW‑01:** Analyst completes **North‑Star** flow in ≤ 15 minutes w/o hand‑holding.
- [ ] **UX‑RPT‑02:** One‑click brief exports PDF/HTML with figures and citations.
- [ ] **UX‑ACC‑03:** Accessibility checks (keyboard nav, contrast, screen‑reader labels) pass.

### J. Red‑Lines & “Won’t Build” Compliance (GOV)

- [ ] **GOV‑RB‑01:** Pentest confirms absence of auto‑actioning/offensive modules.
- [ ] **GOV‑CHK‑02:** Quarterly review logs reaffirm red‑lines; deviations require governance sign‑off.

**Exit Gate (GA):** All **POL**, **PROV**, **ER**, **ANL**, **AI**, **OBS** checks are green; plus ≥2 from **PERF**, all from **SEC**, and all from **UX** and **GOV**.

---

## Test Data & Environment

- **Dataset:** 5–10k entities; 50–100k edges; mixed person/org/events; seeded duplicates & timebounds.
- **Environments:** Dev, Staging (prod‑like), Demo (clean resettable).
- **Fixtures:** Known problematic merges, slow patterns, policy‑violation scenarios.

---

## Runbook Fragments (operational drills)

**Policy Denial Surge**

1. Alert → On‑call paged with sample requests. 2) Identify offending policy. 3) Post‑mortem note + mitigation.

**Slow‑Query Killer**

1. Trip threshold; 2) Abort + capture plan; 3) Notify author; 4) Suggest indexed pattern.

**Audit Integrity**

1. Randomly sample 20 actions/day; 2) Verify actor/policy/reason trace; 3) File discrepancies.

---

## Phase‑2 (Day‑90+) Outlook

- Advanced simulations; border overlays; expedition kits; partner data exchange; offline kits.
- Harden SLOs; multi‑region HA; richer pattern libraries; red‑team/blue‑team exercises.

---

### Notes & Next Steps

- Assign owners per checklist item; wire up status dashboard (traffic‑light).
- Schedule weekly demo cadence aligned to milestones; invite advisor panel as test witnesses.
- Convert this doc to a living artifact (Notion/Confluence) with links to test runs and logs.
