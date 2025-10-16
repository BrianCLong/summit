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

---

## N) Sprint 3 — Nov 3–Nov 14, 2025 (10 biz days)

**Sprint Goal:** Move from **enforced‑behind‑flags** to **progressive enablement** on 3 priority flows; complete **Attestation Ledger v1.0**, **Bitemporal Registry v1.0**, and ship **Narrative Defense Kit v1.0** with prebunk live.

**Definition of Victory (DoV):**

- Flags ON to 25–50% traffic for governed‑field enforcement across 3 flows with <2% false‑block; automated rollback <60m proven in drill.
- All build/ingest/query/export jobs emit **attestations** captured in ledger; external verifier passes on 5 golden paths.
- Bitemporal registry records schema and policy versions with human‑diff UI.
- Narrative kit used in 1 live or simulated incident within SLA (<24h) with receipts.

**Scope (In):**

1. **Policy Compiler v1.0**: rulepacks versioning; bytecode stability tests; signed policy bundles.
2. **Federation Write Sandbox** → **Guarded Writes GA** for idempotent types; conflict resolution playbook.
3. **Attestation Ledger v1.0**: materialized views for receipts; export to audit binder (pdf+jsonl) with stable schema.
4. **Bitemporal Registry v1.0**: time‑travel queries; schema/policy/contract diffs; CLI + UI pane.
5. **Narrative Defense Kit v1.0**: prebunk articles, claim‑evidence‑warrant tables, response macros, channel hygiene checklist.
6. **Release Verification Bundle v0.9**: OPA alerts tuned; synthetic monitors; statuspage automation; runbook links.
7. **Cost Guardrails**: tenant budgets surfaced in NL→Cypher preview; abort on breach; weekly cost report.

**Out of Scope:** multi‑tenant predictive suite; partner API integrations beyond stubs; cross‑org federation writes.

**Stories & Tasks (condensed):**

- _PCS/Provenance_
  - Add attestation emitters to `ingest-*` and `query-*` DAGs; hash set & license rail unified.
  - External verifier CI job for 5 golden paths; red/amber reporting.
- _Policy & Enforcement_
  - Compiler: deterministic ordering; code‑signing; bundle trust test.
  - Enforce: flow‑1 (customer export), flow‑2 (analyst share), flow‑3 (NL→Cypher write) behind progressive rollout 10→25→50%.
- _Registry_
  - Bitemporal tables + diff UI (schema & policy); CLI `regctl` with `snapshot`, `diff`, `replay`.
- _Narrative_
  - Prebunk: 3 posts + FAQ; debunk scripts; incident rehearsal.
- _Ops_
  - Rollback drill; PagerDuty/statuspage wiring; Helm consumer docs finalized; synthetic monitors.

**Acceptance Criteria:**

- 95%+ of relevant jobs emit attestations; 0 schema drift in receipts; verifier green on 5/5 golden paths.
- False‑block ≤ 2%, true‑block ≥ baseline; decision diffs visible in tri‑pane.
- Registry time‑travel returns expected snapshots; human‑readable diffs; CLI usable by ops.
- Narrative incident handled within SLA; receipts attached.

**Metrics & Tripwires:**

- Error budget burn <20%; p95 DAG latency within target.
- Cost guardrail trips → auto‑abort + ticket.
- Policy false‑block >2% → freeze rollout and open rulepack review.
- Attestation coverage <90% → block release train until remediated.

**Risks & Mitigations:**

- Policy churn → rulepack review cadence; shadow mode comparison; sampling.
- Ledger perf hot spots → partitioning & compaction; rollup views.
- Narrative blowback → prebunk first; lawyered facts; single‑source comms.

**Owners (RACI):**

- **R**: Durga IG (coordination), Trust Fabric (policy/compiler), Data Eng (ledger/registry), App Eng (tri‑pane & NL→Cypher), SRE (alerts/rollback), Comms Lead (narrative).
- **A**: Head of Eng, COO (cadence), GC (narrative sign‑off).
- **C**: Security, Sales Ops, Design.
- **I**: Exec staff, Board observers.

**Calendar (cadence overlay):**

- _Mon 11/3_: Kickoff + risk review; flags 10% on flow‑1.
- _Wed 11/5_: Verifier demo; flags 25% on flow‑1; 10% on flow‑2.
- _Mon 11/10_: Rollback drill; flags 50% on flow‑1; 25% on flow‑2; 10% on flow‑3.
- _Thu 11/13_: Narrative rehearsal; attestation export review.
- _Fri 11/14_: Sprint review w/ receipts; go/no‑go for Sprint 4 enablement.

**Demo Script:**

1. Run NL→Cypher with governed field; show cost meter + policy diff; attempt write → blocked with rationale.
2. Export flow passes consent/contract; attestation bundle opens in verifier; bitemporal snapshot diff.
3. Trigger synthetic incident → statuspage + PagerDuty; show rollback within 60m receipt.

**DoD‑Sprint 3:**

- Flags progressively enabled within thresholds; receipts present; external verifier green; narrative kit v1.0 live; rollback drill passed.

---

## O) Sprint 4 (Preview) — Nov 17–Nov 28, 2025 (8 biz days, holiday adjusted)

- Expand enforcement to 5 flows; predictive suite pilot behind flags; standards coalition draft + comment schedule; budget guardrail tuning; board‑brief scaffolding with receipts.
