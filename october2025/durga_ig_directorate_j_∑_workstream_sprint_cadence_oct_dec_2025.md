# [JADE] Directorate J ∑ — Durga IG Workstream Prompt, Sprint Plan & Cadence (Oct–Dec 2025)

**Classification:** INTERNAL // OPS // PCS-Auditable  
**Prepared:** 2025-09-30 (America/Chicago)  
**Source Corpus Reviewed:** `/mnt/data/october2025.zip` and `/mnt/data/summit-main (1).zip` (full archive scan)  
**Provenance Hashes:**

- `october2025.zip` → `92ab340ee190b0078199dad06befe50ca15e7537347f6100b7cd5a7bdd726702`
- `summit-main (1).zip` → `27f925b91197b7354da23bbf09b5c4a9d45803d5d39fca7acd058355e7679388`

---

## A) Exec Thesis (Decisive Idea & Next Best Actions)

- **Thesis:** Lock a **Proof‑Carrying Strategy (PCS)** across Summit/IntelGraph so every artifact (graphs, briefs, exports, decisions) ships with lineage, license, authority, and policy‑bytecode checks; thereby converting the Q4 plan into a **defensible, reversible release train**.
- **Decisive Points:** (1) **Provenance‑First Core** (attestations + policy compiler + bitemporal registry), (2) **Guard‑railed Federation** (read→write with OPA/LAC), (3) **Narrative Defense Kit** (pre‑bunk/de‑bunk + receipts), (4) **Release Verification & Rollback** (canary + SLOs + cost guardrails).
- **Next Best Actions (NBA):**
  1. Stand up **PCS rails**: PR templates, PCQ manifests, source hashing, license binders, OPA/LAC dry‑run gates.
  2. Finish **Federation Write Sandbox** and NL→Cypher **preview‑with‑cost**; enable **feature‑flagged** rollout.
  3. Ship **Q4 Cadence Lock** dashboards: Daily Dispatch, Weekly Portfolio/Risk, Monthly Strategy, Quarterly Board.
  4. Close **runtime gaps**: pagerduty/statuspage wiring, audit export, Helm consumer docs, release verification alerts.

---

## B) COAs — Good / Better / Best

**Good (low effort, moderate impact)**

- Enable **PCS‑lite** (hash + license + citations) on all graph exports and PRs.
- Freeze **cadence rituals**; publish checklists + owners.
- NL→Cypher **read‑only** with cost preview; **policy dry‑run** only.  
  **Risks:** optics w/o full enforcement; partial telemetry.  
  **Decision Gate:** demo receipts on 3 representative workflows.

**Better (medium effort, high impact)**

- **Policy compiler** emits bytecode; enforce **governed‑field blocks** in stage; **federation write‑sandbox** idempotent mutations.
- **Attestation ledger** (build, ingest, query) + **bitemporal schema registry**.
- Release **verification bundle** (OPA alerts + SLO tripwires + auto‑rollback).  
  **Risks:** throughput dips during enforcement; migration complexity.  
  **Decision Gate:** pass stage chaos + audit replay; <1h rollback tested.

**Best (higher effort, durable moat)**

- **Prov‑First GA** with **external verifier** replay, **consent/contract gates** on exports, and **predictive suite pilot** behind flags.
- Full **narrative defense kit** + **red‑team tabletop** + coalition draft for standards influence.  
  **Risks:** scope/coordination; training and comms load.  
  **Decision Gate:** GA sign‑off with board‑level brief & receipts.

---

## C) Sprint 0 (Kickoff) — 3 days (Oct 1–3, 2025)

**Goal:** Initialize PCS rails and cadence mechanics.

- **Deliverables:**
  - `PCS_TEMPLATE/` PR template + PCQ manifest + provenance hash generator.
  - `cadence/` checklists: Daily, Weekly, Monthly, Quarterly; owner matrix.
  - Telemetry baseline: ingest→query DAG timing, cost, error budget SLOs.
- **Owners:** Durga IG (lead), Gov/Ops (gating), Trust Fabric (OPA/LAC), QA/Release (CI).

---

## D) Sprint 1 — Oct 6–Oct 17, 2025 (10 biz days)

**Sprint Goal:** **Guard‑railed Federation (R→W) + PCS‑enforced exports** and **NL→Cypher preview‑with‑cost**.  
**Definition of Victory (DoV):**

- Queries execute via deterministic DAG, emit **PCQ manifest**; **external verifier** replays successfully.
- **Governed‑field** access blocked by policy bytecode; visible **diff + rationale** in tri‑pane UI.
- Federation **write‑sandbox** supports idempotent mutations with **replay + rollback**; flags default **OFF**.
- Daily/Weekly/Monthly cadence dashboards live with SLOs and risk heat.

**Scope (In):**

1. **Provenance Rails**: source hashing, license binding, citation capture, export consent/contract gates (dry‑run).
2. **Policy Compiler v0.9**: ABAC/RBAC rules → bytecode + side‑by‑side diff; enforce in stage.
3. **Federation Write Sandbox**: idempotent mutation runner, journal + bitemporal registry.
4. **NL→Cypher** preview pane + **cost meter**; blocked actions labeled.
5. **Release Verification Bundle v0.1**: OPA alerts, SLO tripwires, canary+rollback script.
6. **Runtime Gaps Sweep #1**: pagerduty/statuspage wiring; Helm consumer docs; audit export pipeline.

**Out of Scope:** Predictive ranking, multi‑tenant budgets, external partner APIs (stubbed).

**Risks & Mitigations:**

- **Policy brittleness** → start in dry‑run, add test corpus; daylight diffs to owners.
- **Write‑path regressions** → sandbox only + feature flags + <1h rollback drill.
- **Cost spikes** → cost meter thresholds + guardrail abort.

---

## E) Sprint 2 — Oct 20–Oct 31, 2025

**Goal:** **Enforce** governed fields in prod behind flags; ship **attestation ledger** + **bitemporal registry**; **Narrative Defense Kit v0.9**.

- Expand export consent/contract from dry‑run to **enforce** for select flows.
- Add external verifier to CI; publish receipts in demo.

---

## F) Rolling Cadence (Q4 2025)

**Daily (H1):** CEO Dispatch (yesterday/today/blockers, cash runway, pipeline delta).  
**Weekly (H2):** Portfolio (product/GTM/ops), Risk & Compliance (incidents, policy drift, attestations), Release Readiness.  
**Monthly (H3):** Strategy/Metrics review; standards/policy map update; budget/OKR tune.  
**Quarterly (H4):** Board Brief with PCS receipts, GA gating decision, moat score.

**Ritual Artifacts:** shared agenda, checklists, decision logs, receipts bundle, red/amber/green heat.

---

## G) Gap Sweep — “See Around Corners” (Closeouts)

1. **Release Verification & OPA Alerts** — ensure alert fidelity, runbook links, test cases; wire rollback automation.
2. **PagerDuty ↔ Statuspage ↔ Helm** — complete consumer docs; add synthetic monitors; verify incident comms loop.
3. **Audit‑Ready Exports** — uniform consent, license, and third‑party contract gates with machine‑readable manifests.
4. **Schema Registry & Time‑Travel** — finalize bitemporal store + diff tooling.
5. **Budget Guardrails** — tenant budget profiles + cost SLOs surfaced in NL→Cypher preview; aborts on breach.
6. **Narrative Hygiene** — prebunk/debunk scripts, fact pattern one‑pagers, Q&A, channel hygiene check.

---

## H) Scorecard & Tripwires

**Objective OKRs (Q4):**

- O1: **PCS coverage** ≥ 90% of PRs/exports with receipts.
- O2: **Policy enforcement** on governed fields in prod (flags ON for 3 high‑value paths).
- O3: **Rollback** < 60 minutes (drill twice/month).
- O4: **SLO adherence**: error budget burn < 20%; p95 DAG latency within target.
- O5: **Narrative kit** shipped; <24h response to misinformation incident.

**KRIs & Tripwires:** policy false‑block rate > 2% → freeze expansion; cost meter > threshold → auto‑abort; attestations < 85% → block release; incident MTTR > target → trigger ops review.

---

## I) Evidence & PCS (assumptions, confidence, falsifiers)

- **Evidentiary Basis:** the two archives (hashes above) including sprint plans for IntelGraph (e.g., _PROVENANCE FIRST_, _Federation Write Sandbox_, cadence lock docs), numerous sprint and runbooks, and repo assets (README, CODEOWNERS, CI configs).
- **Assumptions:** current repo mirrors operational truth; external GitHub access constraints acknowledged; environments dev→stage→prod intact; feature flags available.
- **Confidence:** **High** on near‑term sprint fit; **Medium** on org bandwidth for Best COA.
- **Falsifiers/Tests:** inability to emit PCQ manifests across 3 sample workflows; stage policy enforcement causes >2% false blocks; rollback >60m in drill; receipts not reproducible by external verifier.

---

## J) Artifacts (to be produced this sprint)

- **Scenario Set:** _Trust Hardening vs Velocity Erosion_ (axes: enforcement strictness × telemetry maturity); signposts + early warnings captured.
- **Campaign Tree (Synthetic):** adversary TTPs vs controls map (ATT&CK‑style) for mis/disinfo & policy bypass; coverage/telemetry/policy overlay.
- **Game Matrix:** release strategy (Flags‑Off, Canary, Progressive‑ON) × risk cells with regret bounds.
- **Narrative Defense Kit:** claim‑evidence‑warrant tables, prebunk/debunk scripts, comms checklist.
- **Roadmap & RACI:** 30/60/90 swimlanes for Prov‑First GA, Federation Writes, Narrative Kit, Release Verification.

---

## K) 30/60/90 (Swimlanes)

**30 days (to Oct 31):** PCS‑lite in prod; policy enforce behind flags; ledger + registry live; narrative kit v0.9.  
**60 days (to Nov 30):** expand enforcement to 5 flows; predictive suite pilot gated; coalition draft.  
**90 days (to Dec 28):** Prov‑First GA receipts; board brief; progressive flags‑ON per risk sign‑off.

---

## L) Governance & Provenance

- **Publishable‑by‑default** with redactions.
- **OPA policy stubs/tests** checked in; CI enforces PCS presence.
- **Provenance manifest** (who/what/when/hash) attached to demos and briefs.

---

## M) Definition of Done (DoD‑J)

- Win conditions defined; COA selected with scorecard live; rollback drill completed; receipts present; owners/dates set; PCS attached.
