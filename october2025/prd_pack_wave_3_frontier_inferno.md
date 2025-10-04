# Product Requirements Document (PRD) Pack — Wave 3
Scope: Full PRDs for Frontier & Inferno capabilities that extend trust, safety, and auditability beyond GA—each gated by ethics, safety, and reproducibility standards.

Included PRDs (12):
1) IG‑FR‑L1 — Counterfactual Proof Cartridges (CPC)
2) IG‑FR‑L2 — Policy‑Sealed Computation (PSC)
3) IG‑FR‑L3 — Proof‑of‑Non‑Collection (PNC)
4) IG‑FR‑L4 — Dialectic Co‑Agents (DCQ + DDR)
5) IG‑FR‑L5 — Zero‑Knowledge Early‑Warning Exchange (ZKEWX)
6) IG‑FR‑L6 — Semantic Delta Networks (SDN)
7) IG‑FR‑L7 — Introspective Weight Surgery (IWS)
8) IG‑FR‑L8 — Proof‑Carrying Edge (PCE)
9) IG‑FR‑L9 — Narrative Field Theory (NFT‑x) & Honey‑Pattern Weave (HPW)
10) IG‑FR‑L10 — Counterfactual Risk Budgeting (CRB)
11) IG‑FR‑L11 — Ombuds Autonomy Controller (OAC), Cryptographic Dissent (CDC), Proof‑of‑Purpose/Use‑Decay (PoP)
12) IG‑INFER‑M1 — Quantum‑Safe Attestations & Proofs (QAP/QDP)

> Template: Summary, Problem, Users & Jobs, Requirements (Must/Should/Could), NFRs, Architecture & APIs, Telemetry, Security & Compliance, Success Metrics, Rollout & Risks, Safety Gates.

---
## 1) PRD — IG‑FR‑L1 Counterfactual Proof Cartridges (CPC)
**Summary**: Portable, signed bundles that reproduce an analytic claim under counterfactual toggles (data subsets, parameters, policies) with machine‑checkable proofs.

**Problem**: Decisions require understanding how outcomes change under controlled alternates; reproducibility must be portable across orgs.

**Users & Jobs**: Analysts craft CPCs; reviewers verify and compare deltas; partners validate without full data.

**Requirements**
- **Must**: cartridge spec (dataset refs, transforms, seeds, policies, code hash); counterfactual switchboard; delta metrics; replay harness; Prov‑Ledger linkage; attestation signer; receipt store.
- **Should**: UI composer; templates per analytic type.
- **Could**: cross‑org blinded replay via ZK wrappers.

**NFRs**: replay p95 < 90s (10GB workload); delta calc within 1% tolerance.

**Architecture & APIs**: `cpc‑composer`, `cpc‑runner`, `cpc‑verifier`. APIs: `POST /cpc/build`; `POST /cpc/replay`; `POST /cpc/verify`.

**Telemetry**: replay success, delta variance, policy violations.

**Security & Compliance**: signed artifacts; policy enforcement; license/purpose checks.

**Success**: reviewer acceptance ≥95%; interop pass ≥3 partners.

**Safety Gates**: ethics review for scenario classes; leakage checks on deltas.

---
## 2) PRD — IG‑FR‑L2 Policy‑Sealed Computation (PSC)
**Summary**: Execute computations sealed under explicit policies (purpose, audience, retention), producing sealed receipts and audit proofs.

**Requirements**
- **Must**: policy compiler; secure enclaves/containers; sealed I/O; receipts; revocation; simulation; audit traces.
- **Should**: partner federation mode; remote attestation.
- **Could**: time‑bound auto‑revocation.

**NFRs**: overhead ≤10%; attestation p95 < 1s.

**APIs**: `POST /psc/run`; `POST /psc/attest`; `POST /psc/revoke`.

**Success**: violations → 0; audited acceptance ≥3 partners.

**Safety Gates**: policy linting; deny‑by‑default for ambiguous scopes.

---
## 3) PRD — IG‑FR‑L3 Proof‑of‑Non‑Collection (PNC)
**Summary**: Cryptographic proofs that certain data was *not* collected, accessed, or retained.

**Requirements**
- **Must**: negative commitment schemes; access ledger integration; challenge/response protocol; periodic attestations; auditor UI.
- **Should**: selective transparency controls.
- **Could**: third‑party notarization.

**NFRs**: proof generation p95 < 1s; false‑negative rate ~0.

**APIs**: `POST /pnc/commit`; `POST /pnc/prove`; `GET /pnc/audit`.

**Success**: regulator acceptance; zero substantiated non‑collection violations.

**Safety Gates**: scope creep alarms; independent audit hooks.

---
## 4) PRD — IG‑FR‑L4 Dialectic Co‑Agents (DCQ + DDR)
**Summary**: Dual agents with explicit thesis/antithesis roles produce contested reasoning with DDR (disagreement‑driven review) and signed traces.

**Requirements**
- **Must**: role specialization; evidence debate protocol; contradiction surfacer; adjudication rubric; signed trace ledger; human‑in‑the‑loop checkpoints.
- **Should**: bias library; counter‑prompt sets.
- **Could**: multi‑party debate graphs.

**NFRs**: debate cycles ≤ 3 per answer typical; p95 latency < 3.5s.

**APIs**: `POST /dcq/debate`; `GET /dcq/trace/{id}`.

**Success**: reduction in reasoning errors ≥30%; reviewer trust +0.5.

**Safety Gates**: red‑team prompts; escalation for sensitive decisions.

---
## 5) PRD — IG‑FR‑L5 Zero‑Knowledge Early‑Warning Exchange (ZKEWX)
**Summary**: Partners exchange early‑warning signals via ZK proofs—alerting on overlaps or risk patterns without revealing raw indicators.

**Requirements**
- **Must**: overlap/no‑overlap proofs; bounded‑leakage protocol; rate‑limited sessions; partner registry; receipts; revocation.
- **Should**: motif‑based alerts; watchlist cartridges.
- **Could**: multi‑hub routing.

**NFRs**: session p95 < 2.5s; leakage 0 by design.

**APIs**: `POST /zkewx/handshake`; `POST /zkewx/proof`.

**Success**: ≥5 partner pilots; confirmed early warnings with zero leaks.

**Safety Gates**: jurisdictional policy sealing; abuse prevention quotas.

---
## 6) PRD — IG‑FR‑L6 Semantic Delta Networks (SDN)
**Summary**: Fine‑grained change‑graph capturing semantic deltas across entities, narratives, models, and policies.

**Requirements**
- **Must**: delta diff engine; schema for change types; impact propagator; rollback/redo; provenance linking; query API.
- **Should**: visualization timeline; blast‑radius estimates.
- **Could**: anomaly alerts on suspicious change patterns.

**NFRs**: ingest 1M deltas/min; query p95 < 1s.

**APIs**: `POST /delta/record`; `GET /delta/impact`.

**Success**: post‑change incidents ↓40%; audit resolution time ↓50%.

**Safety Gates**: privileged‑change protections; dual control.

---
## 7) PRD — IG‑FR‑L7 Introspective Weight Surgery (IWS)
**Summary**: Controlled, auditable interventions on model weights with bounded impact receipts and rollback.

**Requirements**
- **Must**: patch authoring; evaluation harness; canary/rollback; impact receipts; provenance; policy gates.
- **Should**: minimal‑diff regularizers; safety tests.
- **Could**: counterfactual weight cartridges.

**NFRs**: patch apply p95 < 60s; rollback < 30s.

**APIs**: `POST /iws/patch`; `POST /iws/rollback`; `GET /iws/receipt`.

**Success**: fix time weeks→hours; safety regressions → 0.

**Safety Gates**: red‑team suite; governance approvals.

---
## 8) PRD — IG‑FR‑L8 Proof‑Carrying Edge (PCE)
**Summary**: Edge‑side analytics that emit proofs (PCQ/PSC) and signed sync receipts, enabling trustable offline ops.

**Requirements**
- **Must**: edge runtime; proof emitters; CRDT sync; key management; selective disclosure; conflict UI.
- **Should**: bandwidth‑aware schedules.
- **Could**: on‑device motif probes.

**NFRs**: proof size overhead <15%; sync p95 < 5m/GB.

**APIs**: `POST /edge/run`; `POST /edge/proof`; `POST /edge/sync`.

**Success**: offline continuity ≥99%; verifier pass ≥99.5%.

**Safety Gates**: device attestation; remote kill‑switch.

---
## 9) PRD — IG‑FR‑L9 Narrative Field Theory (NFT‑x) & Honey‑Pattern Weave (HPW)
**Summary**: Model narrative dynamics as fields over graphs; HPW detects coordinated narrative patterns; outputs auditor‑friendly overlays.

**Requirements**
- **Must**: narrative field estimators; HPW motif library; provenance of signals; counter‑narrative stress tests; explain overlays.
- **Should**: intervention simulations; sensitivity analysis.
- **Could**: cross‑lingual narrative fields.

**NFRs**: 100M posts ingest/day; p95 query < 2s for motif views.

**APIs**: `POST /nftx/estimate`; `POST /hpw/detect`.

**Success**: precision/recall ≥0.8; false‑positive appeals <5%.

**Safety Gates**: protected‑class safeguards; transparency reports.

---
## 10) PRD — IG‑FR‑L10 Counterfactual Risk Budgeting (CRB)
**Summary**: Allocate risk budgets to actions based on counterfactual impact envelopes; block or shape actions when budgets exceeded.

**Requirements**
- **Must**: risk envelope calculator; action gates; budget ledger; simulation; appeals; audit.
- **Should**: per‑team budgets; scenario presets.
- **Could**: external regulator view.

**NFRs**: gate decision p95 < 50ms; simulation 10k runs < 60s.

**APIs**: `POST /crb/calc`; `POST /crb/gate`.

**Success**: harmful action incidents ↓; appeal resolution MTTR < 24h.

**Safety Gates**: ethics council checkpoints.

---
## 11) PRD — IG‑FR‑L11 OAC/CDC/PoP
**Summary**: Ombuds Autonomy Controller enforces human‑over‑AI control; Cryptographic Dissent records protected challenges; Proof‑of‑Purpose/Use‑Decay ensures time‑bound, purpose‑bound access.

**Requirements**
- **Must**: OAC policy gates; CDC signed dissent channels; PoP tokens with decay; dashboards; appeals; legal hold.
- **Should**: anonymized dissent option.
- **Could**: whistleblower escrow.

**NFRs**: gate p95 < 40ms; dissent filing < 5s.

**APIs**: `POST /oac/gate`; `POST /cdc/file`; `POST /pop/mint`.

**Success**: override incidents tracked; resolutions on‑time ≥95%.

**Safety Gates**: retaliation safeguards; independent ombuds.

---
## 12) PRD — IG‑INFER‑M1 Quantum‑Safe Attestations & Proofs (QAP/QDP)
**Summary**: Quantum‑safe signatures and zero‑knowledge proofs for all attestations and manifests.

**Requirements**
- **Must**: PQC algorithms (NIST finalists); migration plan; dual‑stack signing; proof verification; hardware support; cross‑region key mgmt.
- **Should**: crypto‑agility; canary deployments.
- **Could**: time‑lock proofs.

**NFRs**: sign/verify p95 within 2x of classical; 99.99% availability.

**APIs**: `POST /qap/sign`; `POST /qap/verify`.

**Success**: 100% manifests quantum‑safe by phase end.

**Safety Gates**: cryptographic review; rollback plan.

---
### Global Sections (applies to all above)
**Security & Compliance**: ABAC/OPA integration; DPIA as needed; export manifests; jurisdictional policies for cross‑org flows; hardware‑backed keys; transparency logs.

**Telemetry & Analytics**: proof sizes, verify latency, policy blocks, appeals, adoption funnels, partner interop metrics.

**Rollout Strategy**: gated experiments → pilots → staged GA; red‑team reviews; partner co‑validation where applicable.

**Risks & Mitigations**: leakage (use ZK/PSC); cost/latency (opt‑in proofs, compaction); governance drift (OAC/CDC/PoP); crypto migration risks (dual‑stack, canaries).
