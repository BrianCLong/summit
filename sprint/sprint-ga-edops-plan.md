# Sprint Plan: IntelGraph Disinformation GA “Proof-First” Sprint

**Mission:** Ship Evidence-first Disinformation Ops (E-DOps) GA-clincher.
**Timebox:** 2 weeks (10 business days).
**Theme:** "If it lacks a proof, it does not ship."

---

## Sprint Theme

**Ship a defensible, reproducible “v1” artifact bundle**: runnable reference implementation + eval harness + integration stub + patent scaffold + compliance inventory—enough to demo, benchmark, and file.

---

## Workstream A — Product & Requirements (PM/Tech Lead)

**Goal:** lock the “what” so every other stream ships against stable interfaces.

**Backlog**

*   [3] **A1. One-page PRD (E-DOps)**: Target user (OSINT/disinfo analyst), Top 3 use-cases (Map, Simulate, Verify), Constraints (p95 < 1.5s, offline verify), Success metrics (D1-D5).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (Primary User Story).
*   [2] **A2. KPI spec**: Primary (External Verification %), Secondary (Time-to-COA, $/insight).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (Key KPIs).
*   [3] **A3. Threat Model**: Abuse cases (Poisoned Corpus, Fake Proofs, Privacy Leakage) + Mitigations (Merkle, DP, ZK).
    *   *Source:* `october2025/investigate1.md` (Threat Model & Mitigations).

**Deliverables**

*   `/design/prd.md`
*   `/benchmark/kpis.md`
*   `/design/threat_model.md`

**DoD**

*   Metrics are measurable via harness; constraints are testable; mitigations have enforcement hooks.

---

## Workstream B — Architecture & Method (ARCHITECT)

**Goal:** choose the core “moat-bearing” technical approach + interfaces.

**Backlog**

*   [5] **B1. Method spec (PCA/PCQ + ZK-TX)**: Symbols, pseudocode for Merkle proofs, ZK set intersection, and License Compiler (LAC).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (B1, B2, B3).
*   [5] **B2. Module boundaries and APIs**: Ingest (Signed) → Transform (Field Metrics) → Compute (Counterfactuals) → Outputs (Proven bundles).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (A1-A3).
*   [3] **B3. Integration contract**: CLI/SDK schemas for Verifier and Federation.
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (G1, G2).

**Deliverables**

*   `/spec/method.md`
*   `/spec/interfaces.md`
*   `/integration/api_contract.md`

**DoD**

*   An engineer can implement without ambiguity; every component has I/O definitions + invariants.

---

## Workstream C — Reference Implementation (EXPERIMENTALIST/ENG)

**Goal:** working v1 that runs end-to-end locally and in CI.

**Backlog**

*   [2] **C1. Python package scaffold**: `intelgraph-edops` (`pyproject.toml`, CLI `ig-verify`).
*   [8] **C2. Core algorithm implementation**:
    *   **Disinfo Map v2**: Burst detection + influence paths (A1).
    *   **Narrative Counterfactuals**: Uplift/Risk simulation (A2).
    *   **Proof Generator**: Merkle tree construction for exports (B1).
*   [3] **C3. Telemetry**: Glass-box traces (B7) + Prometheus metrics (Cost, Latency).
*   [5] **C4. Unit tests + golden tests**: Fixtures for verified/failed proofs.

**Deliverables**

*   `/impl/` (package + CLI)
*   `/impl/tests/`
*   `Makefile` + `./scripts/run_local.sh`

**DoD**

*   `make bootstrap && make test && make run` passes on a clean machine.

---

## Workstream D — Benchmark & Evaluation Harness (EXPERIMENTALIST)

**Goal:** prove delta (or at least establish a baseline with credible rigor).

**Backlog**

*   [3] **D1. Dataset selection**: Red-team pack (Adversarial narratives, Poisoning samples).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (Deliverable 5).
*   [5] **D2. Eval harness**: `ig-verify` CLI wrapper for offline proof checking (D1).
*   [3] **D3. Baselines**: Comparison vs dashboard-only (no proof) workflow (D5 Analyst Value).
*   [2] **D4. Reporting**: JSON summary of Verification Rate and Time-to-COA.

**Deliverables**

*   `/experiments/` (configs, sweeps)
*   `/benchmark/eval_harness.py`
*   `/benchmark/results/` (JSON + markdown report)
*   `/benchmark/dataset_cards/`

**DoD**

*   Reproducible run from a single command; results artifacted; ablations included.

---

## Workstream E — IP & Prior Art (PATENT-COUNSEL)

**Goal:** file-ready scaffold with claim surface aligned to actual implementation.

**Backlog**

*   [3] **E1. Prior-art shortlist**: Existing RAG/Provenance patents.
    *   *Source:* `october2025/investigate1.md` (FTO Summary).
*   [3] **E2. Patent scaffold**: "Proof-Carrying Context for Disinformation Ops".
    *   *Source:* `october2025/investigate1.md` (Provisional Draft).
*   [5] **E3. Claims**:
    *   **Independent**: Method for verified narrative mapping; System for ZK-based federation.
    *   **Dependent**: Sketch-first pruning, License compilation.
*   [2] **E4. Design-arounds**: "What we’d enforce".

**Deliverables**

*   `/ip/draft_spec.md`
*   `/ip/claims.md`
*   `/ip/prior_art.csv`
*   `/ip/fto.md`

**DoD**

*   Claims map cleanly to code paths + configuration knobs; enablement is credible.

---

## Workstream F — Compliance & Provenance (SEC/ENG)

**Goal:** ship audit-ready artifacts (license hygiene + SBOM + data governance).

**Backlog**

*   [3] **F1. Third-party inventory**: Policy checks for graph libraries (NetworkX, Neo4j).
*   [2] **F2. SBOM**: SPDX generation for `intelgraph-edops`.
*   [3] **F3. Data handling policy**: "Proof-of-Non-Collection" implementation (Mission Data/Ethics).
*   [2] **F4. Security checklist**: Secrets scanning, header sanitization.

**Deliverables**

*   `/compliance/THIRD_PARTY.md`
*   `/compliance/sbom.spdx.json`
*   `/compliance/data_governance.md`
*   `.github/workflows/ci.yml` (lint/test/sbom)

**DoD**

*   No GPL/AGPL inbound; SBOM generated in CI; logs proven non-PII by test fixture.

---

## Workstream G — Integration Stubs & Demo (ENG)

**Goal:** make it callable from target products + create a demo path.

**Backlog**

*   [3] **G1. SDK wrapper**: Python SDK for `intelgraph-edops`.
*   [5] **G2. IntelGraph connector stub**: Schema for "Narrative Field" (NFT-x) nodes.
*   [5] **G3. Summit runtime stub**: "Tri-pane" UI mock data flow (Map ↔ Timeline).
*   [5] **G4. Demo notebook / scenario**: "E-DOps GA Flow" (Ingest -> Map -> Simulate -> Verify).
    *   *Source:* `sprint/edops-ga-sprint-prompt.md` (Deliverable 1).

**Deliverables**

*   `/integration/sdk_python/`
*   `/integration/examples/intelgraph_pipeline.json`
*   `/integration/examples/maestro_conductor_job.yaml`
*   `/integration/demo.md` (5-minute runbook)

**DoD**

*   Demo runs end-to-end with a single command; produces a trace + metrics.

---

## Workstream H — Commercial Packaging (COMMERCIALIZER)

**Goal:** define licensable units and who pays for them.

**Backlog**

*   [2] **H1. License menu**: "Verifier" (Free) vs "Generator" (Paid).
*   [3] **H2. Partner list**: 2 synthetic partners for ZK demo (e.g., "Ally-A", "Ally-B").
*   [3] **H3. Pricing model**: Per-Proof or Per-Exchange (ZK).
    *   *Source:* `october2025/investigate1.md` (Monetization).

**Deliverables**

*   `/go/brief.md`
*   `/go/license_menu.md`
*   `/go/partners.md`
*   `/go/roi_template.xlsx`

**DoD**

*   Clear SKU boundaries; 3 target customers with adoption path + estimated value.

---

# Sprint-Level Milestones (time-boxed)

**By Day 3**

*   PRD (A1), Method Spec (B1), and Threat Model (A3) frozen.
*   Scaffold (C1) and Basic Map Algo (C2-Part1) committed.

**By Day 7**

*   Core Algo (C2) complete with Proof Generation.
*   Eval Harness (D2) running against Golden Fixtures (C4).
*   Integration Stubs (G2, G3) ready for wiring.

**By Day 10 (Sprint End)**

*   E-DOps Demo (G4) fully functional with ZK Exchange (G2).
*   Patent Scaffold (E2/E3) and Compliance Artifacts (F2/F3) complete.
*   GA Release tagged.

---

## Next-Steps Kanban

*   [ ] A1 PRD + scope freeze (Blocking: B1, C2)
*   [ ] B1 Method spec + pseudocode (Blocking: C2)
*   [ ] C1 Package scaffold + CLI
*   [ ] C2 Core algorithm v1 (Blocking: D2, G4)
*   [ ] D1 Dataset selection (Blocking: D2)
*   [ ] D2 Eval harness + seeds
*   [ ] G4 Demo notebook / scenario (Blocking: H2)
*   [ ] E2 Patent scaffold
*   [ ] F2 SBOM + CI workflow
