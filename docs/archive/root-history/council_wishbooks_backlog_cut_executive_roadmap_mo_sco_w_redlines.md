# Council Wishbooks — Backlog Cut & Executive Roadmap

**Scope of this artifact**

- Convert the four Wishbooks into a **buyer-credible, ship-first plan**.
- Provide a **MoSCoW-tagged backlog cut** with redlines (adds/removes/defers) and an **acceptance matrix**.
- Provide a **one-page executive roadmap** with milestones, KPIs, and gating criteria.

---

## 1) MoSCoW Backlog Cut (Ship-Class vs Patent-Class)

**Legend**

- **M** = Must Have (Ship in next 1–2 releases)
- **S** = Should Have (Near-term, does not block GA)
- **C** = Could Have (Opportunistic, spikes)
- **W** = Won’t Have Now (Parked R&D / Patent-Class)
- **[REDLINE]** = Change vs source Wishbooks

| Epic                                            | Capability                                                             | MoSCoW | Why / Business Outcome                                                  | Dependencies                  | Acceptance (excerpt)                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------- | -----: | ----------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **PCQ (Proof-Carrying Quality) Manifests**      | Structured, verifiable output contracts for reports/answers            |  **M** | Establish trust & auditability; unblock enterprise pilots               | Schema registry; Verifier CLI | Given inputs and PCQ vN, outputs carry pass/fail proof bundle ≤300ms check; contract drift alerting works      |
| **Authority Compiler**                          | Policy & source-of-truth compiler to bind purpose/authority to queries |  **M** | Reduce compliance review time by 50%; prevent mis-scoped queries        | PCQ; policy store             | Compile time ≤2s; denies out-of-scope queries with human-readable rationale; policy diff view present          |
| **ZK-TX Deconfliction**                         | Zero-knowledge selective disclosure across parties                     |  **M** | Enable cross-org work w/o raw data exchange; convert 2 lighthouse deals | Cryptographic libs; partners  | End-to-end demo with 2 partners; disclosure log + revocation; verifier accepts third-party attestations        |
| **Federation Planner**                          | No-copy federation w/ push-down claims & lineage                       |  **M** | Data residency & vendor neutrality; competitive moat                    | Connectors; lineage graph     | Join plan shows which party computed what; lineage graph contains hashes & timestamps; replay yields same plan |
| **Portable Provenance & Disclosure Bundles**    | Shareable, tamper-evident artifacts                                    |  **S** | Shorten sales cycles; enable regulator demos                            | PCQ; Authority Compiler       | Bundle verifies offline; redactions auditable; renders in Report Studio                                        |
| **Report Studio + “Explain-This-Decision”**     | Authoring & XAI overlays (selective disclosure)                        |  **S** | Adoption by analysts; mitigates black-box risk                          | PCQ; Provenance               | Decision overlay cites sources; toggled redaction view; export to PDF/JSON                                     |
| **Golden Connectors (Top 5)**                   | Hello-world ingest + conformance tests                                 |  **M** | Unblocks pilots; ensures IO stability                                   | ER canonical model            | Each connector passes schema conformance; golden fixtures in CI                                                |
| **Connectors (6–25)**                           | Priority vendor set beyond top 5                                       |  **S** | Coverage breadth for mid-market                                         | Golden framework              | 95% coverage of critical fields; backfill jobs pass                                                            |
| **Governance & Ops Playbooks**                  | SLOs, incident runbooks, lawful-use guardrails                         |  **M** | Enterprise readiness & buyer confidence                                 | N/A                           | SLOs published; oncall escalation tested; audit log immutable                                                  |
| **Testing: Chaos & Contract**                   | Contract tests + fault injection                                       |  **S** | Stability, lower MTTR                                                   | PCQ; Connectors               | Contract tests in CI; chaos suite shows <3% error amplification                                                |
| **Edge/Offline Kits (CRDT)**                    | Merge/resync with logs                                                 |  **C** | Field ops & disconnected sites                                          | Connectors; lineage           | CRDT demo with conflict UX; resync audit trail complete                                                        |
| **Narrative Causality Tester**                  | Counterfactuals & COA sims                                             |  **C** | Differentiated analysis UX                                              | Graph + XAI                   | Hypothesis runs produce counterfactual set with confidence intervals                                           |
| **Policy‑Sealed Computation**                   | Code runs under policy seals                                           |  **W** | Patent-class R&D; high risk                                             | Cryptographic R&D             | Prototype later under R&D program                                                                              |
| **Proof‑of‑Non‑Collection / Non‑Existence**     | Prove absence of data                                                  |  **W** | Patent-class; partner-driven                                            | ZK research                   | Narrow prototype only with design partner                                                                      |
| **Quantum‑Resilient Proofs & “Inferno” Agents** | Forward-secure schemes; autonomous agent mesh                          |  **W** | Visionary, long horizon                                                 | External advisory             | Stage-gated R&D only                                                                                           |

**[REDLINE]**: Reclassify **Policy‑Sealed Compute**, **PoNC/PoNE**, **Quantum/Inferno** as **Won’t Have Now (R&D / Patent-Class)** to protect near-term delivery.  
**[REDLINE]**: Elevate **Portable Provenance** from C→S to align with regulator/demo needs.  
**[REDLINE]**: Cap connectors to **Top 5 “Golden” + 20 priority** in H1; defer remainder.

---

## 2) Unified Acceptance Matrix (Feature → Fixtures → Verifier)

> _This matrix anchors scope, tests, and sign-off. Expand each row into detailed test files in the repo._

| Feature                         | Test Fixtures (Goldens)                                               | Verifier / CLI Checks                                                             | KPIs / SLOs                                                 |
| ------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| PCQ Manifests                   | Sample inputs/outputs per report type; drifted and compliant variants | `verify pcq --bundle …` returns PASS/FAIL with reasons; drift alert event emitted | ≥95% outputs PCQ-verified in pilots; verify ≤300ms          |
| Authority Compiler              | Policy packs (HR, Legal, Intel); positive/negative scopes             | `compile policy` produces purpose‑bound plan; blocked queries show rationale      | ≥90% policy violations blocked pre-exec; policy compile ≤2s |
| ZK‑TX Deconfliction             | Multi‑party redaction sets; adversarial cases                         | `verify zk-tx` accepts third‑party attestations; revocation works                 | Close 2 pilot deals; zero raw PII movement                  |
| Federation Planner              | Cross‑tenant transformation cases                                     | `plan federation` shows push‑down; replay reproducible                            | 100% lineage coverage; plan replay deterministic            |
| Provenance/Disclosure Bundles   | Tampered vs clean bundles                                             | `bundle verify` detects tamper; redactions logged                                 | 100% offline verification; <1% false tamper                 |
| Report Studio / Explain Overlay | Decision trees with source citations                                  | UI shows selective disclosure; export exact                                       | Analyst NPS ≥50; time‑to‑explain <2 min                     |
| Golden Connectors (Top 5)       | Canonical ER samples per vendor                                       | `conn test` passes schema; backfill ≥1M rows                                      | Conformance 100%; ingest p95 <5 min per 1M rows             |
| Governance & Ops                | Synthetic incidents & abuse attempts                                  | `audit scan` invariants hold; oncall drill runbook pass                           | MTTR <30m; 100% lawful-use checks enforced                  |

---

## 3) Release Train & Milestones (next 90 days)

**Release 0 (T‑14 days): Scope Lock & Infra Ready**

- Finalize acceptance matrix v1; freeze schemas for PCQ/Authority.
- Partner MoUs for ZK‑TX pilot; designate two lighthouse customers.
- CI jobs for verifier commands (pcq, compile, zk‑tx, bundle, plan).

**Release 1 (Day 0): Pilot‑Ready Core**

- PCQ Manifests (v1), Authority Compiler (v1), Golden Connectors (Top 5), Governance/Ops playbooks (v1).
- Verifier CLI public beta.
- KPI baselines captured.

**Release 2 (Day 30): Federation + ZK‑TX Pilot**

- Federation Planner (v1) and ZK‑TX end‑to‑end demo with 2 partners.
- Portable Provenance Bundles (beta).
- Chaos & Contract Testing suite enabled in CI.

**Release 3 (Day 60): Reportability & Explainability**

- Report Studio + Explain overlay (beta).
- Provenance Bundles GA; offline verification docs published.
- Connectors 6–15 shipped; conformance dashboard live.

**Release 4 (Day 90): Scale & Sustain**

- Connectors 16–25; backfill tooling GA.
- Ops SLOs enforced via policy; audit exports & SOC‑friendly controls.
- GA readiness review; win/loss loop into roadmap.

**Gating Criteria per Release**

- **R0 → R1:** PCQ/Authority acceptance tests green in CI; security review signed.
- **R1 → R2:** 2 partner pilots instrumented; zero raw PII exchange observed.
- **R2 → R3:** ≥80% analyst tasks use Report Studio; explain‑overlay satisfaction ≥4/5.
- **R3 → R4:** Connector coverage ≥25; ops MTTR ≤30m for 3 consecutive drills.

---

## 4) Risks & Mitigations

| Risk                                  | Impact                  | Likelihood | Mitigation                                                     |
| ------------------------------------- | ----------------------- | ---------: | -------------------------------------------------------------- |
| Cryptographic complexity delays ZK‑TX | Slips partner timelines |     Medium | Pre‑select audited libs; narrow to 2 disclosure patterns first |
| Connector scope sprawl                | Miss GA                 |       High | Cap to 25; enforce conformance gate before adding vendors      |
| Policy compilation false positives    | Block analyst workflows |     Medium | Human‑readable rationale + override workflow with audit trail  |
| Federation ambiguity with partners    | Shelfware risk          |     Medium | Write joint acceptance plan; replay tests shared across orgs   |

---

## 5) Team & Ownership (RACI snapshot)

- **Trust Fabric (PCQ, Authority, ZK‑TX):** Engineering (R), Crypto Lead (A), PM (C), Security (I)
- **Federation & Connectors:** Data Eng (R), Partner Eng (A), PM (C), QA (I)
- **Reportability (Studio, Provenance):** UX (R), Eng (A), PM (A), Solutions (C)
- **Governance & Ops:** SRE (R), Security (A), PM (C), Legal (I)

---

## 6) One‑Page Executive Roadmap (print‑ready)

**Vision**: Ship a verifiable, explainable intelligence platform that enables cross‑organization collaboration **without moving raw data**.

**Now → 90 Days (Phased)**

1. **Trust Baseline (Day 0):** PCQ + Authority + Golden Connectors + Ops (pilot‑ready).
2. **Federated Proofs (Day 30):** ZK‑TX + Federation Planner pilots; Portable Provenance beta.
3. **Explainable Reports (Day 60):** Report Studio + selective disclosure; Provenance GA.
4. **Scale & Govern (Day 90):** Connector expansion; SLOs & audit controls GA; GA readiness review.

**KPIs**

- ≥95% outputs PCQ‑verified; policy compile ≤2s; verify ≤300ms.
- 2 partner pilots live; **0** raw PII transfers.
- Analyst NPS ≥50; time‑to‑explain <2 minutes.
- MTTR <30 minutes; 25 connectors with 100% conformance.

**Guardrails**

- Patent‑class items (Policy‑Sealed Compute, PoNC/PoNE, Quantum/Inferno agents) **explicitly gated** as R&D; no commitment on GA window.

**Next Steps (Exec asks)**

- Approve **scope lock** and **pilot list**.
- Greenlight budget for crypto audit & partner onboarding.
- Publish acceptance matrix to customers (marketing + docs).

---

### Appendix: Redline Summary

- Move visionary items to **R&D backlog** to protect near‑term delivery.
- Elevate **Portable Provenance** to near‑term for regulator demos.
- Cap connector scope; require conformance before expansion.
