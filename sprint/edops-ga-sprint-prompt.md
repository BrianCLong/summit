# IntelGraph Disinformation GA “Proof-First” Sprint (10 business days)

## Role and Mission

- Cross-functional swarm (Product, Graph/ML, Frontend, DevEx, Governance) executing a single GA-clincher: Evidence-first Disinformation Ops (E-DOps).
- Ship working software, not slides. Everything is auditable, reproducible, and safe-by-default.

## Non-Negotiable North Stars

1. Evidence > Opinion: Every analytic/narrative export must carry machine-verifiable provenance, model/version, and transformation chain (Proof-Carrying Analytics & Queries). If it cannot be verified offline, it cannot ship.
2. Zero-Copy Federation: Cross-tenant collaboration uses verifiable claims (ZK overlap/range proofs), never raw data handoff.
3. Ethical Autonomy: Agents are glass-box (full traces), policy-bound (authority/license compiler), and constrained by ombuds bytecode.
4. Disinfo Physics, not dashboards: Treat narratives as “fields,” mine causal deltas, and recommend COAs only when uplift > risk budget.

## Primary User Story

“As an OSINT/disinfo analyst, I can (1) map a narrative and its actors, (2) measure spread/causality, (3) pressure-test counter-messaging ethically, and (4) publish a selective-disclosure brief with proofs—so that partners and the public can verify claims without trusting us.”

## Scope and Definition of Done

### Runbooks (agentic, replayable)

- **A1. Disinformation Network Mapping v2:** Seed narratives → burst detection → influence paths → cadence/bot signatures → candidate COAs (export carries proofs). DONE = 1-click run with KPIs visible and citations inline.
- **A2. Narrative Counterfactuals:** Simulate counter-messaging vs expected harm; block COA if uplift ≤ risk threshold; surface “flip conditions.” DONE = side-by-side COA cards with confidence bands.
- **A3. Selective Disclosure Packager:** Court/press/partner bundles; audience-scoped redaction; revocable with provenance manifest. DONE = external verifier accepts bundle; revocation invalidates prior opens.

### Platform Capabilities (integrated end-to-end)

- **B1. Proof-Carrying Analytics/Queries (PCA/PCQ):** Per-result Merkle/attestation manifest; 1-click verifier.
- **B2. Zero-Knowledge Trust Exchange (ZK-TX):** True/false overlap on hashed selectors; no raw PII egress; audit contains proofs only.
- **B3. Authority/License Compiler (LAC):** Compile warrants/licenses/purpose into policy bytecode; unsafe ops cannot execute.
- **B4. Narrative Field Layer (NFT-x):** Narrative “field” metrics (gradients/sinks) + minimal-intervention recommendations.
- **B5. Counterfactual Risk Budgeting (CRB):** COA gate bound to risk budget; requires mitigation suggestions on failure.
- **B6. Honey-Pattern Weave (HPW) [defensive]:** Ethical canary motifs to map hostile collectors; telemetry loop to attribution graph.
- **B7. Glass-Box Agents + Reasoning-Trace Signatures:** Full prompt/tool logs, content-minimized signed traces; deterministic replay.

### UX/Workflow (tri-pane: graph ↔ timeline ↔ map)

- **C1. Explain-This-Decision:** Any paragraph in a brief reveals its evidence map, dissent nodes, and policy bindings.
- **C2. “What Changed?”:** Human-readable diff of claims/entities/views; subscribe to meaningful deltas (not documents).
- **C3. Cost/Risk badges:** $/insight and harm-budget meters on heavy queries/COAs.

### GA Acceptance Criteria (all must pass)

- **D1. Verifiability:** ≥95% of exported results validate with external verifier; zero unexplained deltas.
- **D2. Safety/Governance:** 100% policy hit-rate; blocked actions show clear reasons and appeal path; dissent capture mandatory on high-risk COAs.
- **D3. Federation:** At least one cross-tenant deconfliction resolved via ZK-TX with zero data handoff.
- **D4. Performance/Resilience:** p95 query < 1.5s on standard hop set; offline kit roundtrips with signed sync logs; chaos drill passes.
- **D5. Analyst Value:** Time-to-first-COA reduced ≥30% vs baseline; precision/recall on labeled disinfo cases meets benchmark; operator can cite “why.”

### Key KPIs (track daily)

- % exports with valid PCQ; % external verifications passed
- # ZK-TX exchanges; time-to-coordination; zero-leakage audits
- COA uplift>risk approvals; # blocked by CRB; mitigation cycle time
- $/insight; joules/insight; cost-guard savings
- Diff-to-decision latency; analyst TTFI

### Data, Ethics, & Guardrails

- Licensed/consented inputs only; license/TOS enforcement at ingest and export.
- No targeted violence enablement, repression, or coercive modules; deception tooling is defensive/testing-only and risk-capped.
- Proof-of-Non-Collection reports scheduled monthly; purpose clocks/decay enforced on all derivatives.

### Deliverables (by Day 10)

1. E-DOps demo flow: ingest → map → simulate → brief (with external verifier).
2. 3 Runbooks productionized (A1–A3) with runbook provers + KPIs.
3. Verifier CLI + UI “Validate Proofs” button.
4. Partner ZK demo (two tenants) with deconfliction proof.
5. Red-team pack: adversarial narrative tests + poisoning drill regression.
6. Docs: model/ethics cards, operator playbook, ombuds checklist, sample bundles.

### Team Cadence

- Day 1: Cut branches; golden path storyboard; fixtures; acceptance tests skeleton.
- Day 2–6: Parallel tracks (Runbooks; PCA/ZK/LAC; NFT-x/CRB/HPW; UX; Verifier; Ops).
- Day 7: Integrated end-to-end; begin chaos + cost guard; fix flake.
- Day 8–9: ZK partner demo; disclosure wallet; doc hardening; dry run.
- Day 10: GA demo; external verification; publish proof-of-superiority dashboard.

### Out-of-Scope

- Any live manipulative ops; any deanonymization without lawful authority; any export without proofs.

### Execution Style

- Ship thin, verifiable slices daily; favor claims + proofs over feature breadth.
- If a feature lacks a proof, it is not a feature—defer or redesign.

### Definition of Done

A non-employee can (a) open the exported bundle, (b) verify proofs offline, and (c) reproduce key metrics on fixtures, all without access to the data store.

## Why This Leapfrogs the Field (anchors)

- Runbook R3 Disinformation Network Mapping underpins A1 with KPIs and citations baked in.
- Narrative Counterfactuals and Selective Disclosure Packager (Volume II runbooks R54, R56) extend beyond detection to provable intervention and audience-scoped sharing.
- PCA/PCQ, ZK-TX, and the Authority/License Compiler codify verifiability and federation; specs and KPIs are defined for confident shipping and measurable superiority.
- “Counter-deception by design” realized via NFT-x, HPW, and CRB: narrative physics, ethical canarying, and risk-budget gating as a coherent capability set.
- Glass-box agents, runbook provers, and signed reasoning traces deliver autonomy without opacity.
- Operational bar (p95 < 1.5s, offline kits, chaos/DR) and tri-pane UI sync carry disinfo features to GA.
- Guardrails: strict ethics and license/TOS enforcement keep launches compliant and partner-safe.

## Ultra-Concise Pin

Build E-DOps GA in 10 days: ship Disinfo Mapping v2 + Narrative Counterfactuals + Selective Disclosure with full PCA/PCQ, ZK-TX, LAC, NFT-x/HPW/CRB, and glass-box agents. Success = external verifier passes; ZK partner demo works; uplift>risk COAs only; tri-pane UX with explain-this-decision + diff-everywhere; p95 < 1.5s; offline kit verified; zero ethics breaches. If it lacks a proof, it does not ship. (See acceptance & KPIs above.)

## Quick Questions

1. Which two tenants/partners should power the ZK-TX demo (realistic but synthetic data acceptable)?
2. Should the first COA simulator standardize on text-only narrative uplift, or include limited geo/temporal overlays now?
3. Which three KPIs should be surfaced prominently in the demo dashboard (trust, federation, or cost/energy)?
4. For HPW canaries, what are the safe domains and pre-approved motifs for the defensive sandbox?

## Suggested Branching (optional)

- `feature/disinfo-ga-edops`
- `feat/pcq-verifier`
- `feat/zk-tx-demo`
- `feat/nftx-crb`
