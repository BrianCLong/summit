# 🗡️ Council of Spies & Strategists — Sprint 11 Plan (Q1 2028)

> Opening: “When the system meets the world, proofs must travel faster than promises.”

## Sprint Goal (14–21 days)
Harden for broad, mission‑grade deployments by advancing **Autonomy Guardrails v2**, standing up an **Evidence Supply Chain** (from capture → transform → publish → consume with attestations), delivering **Run‑at‑Scale Ops** (tenant migrations, blue/green upgrades), and adding **GreenOps** (cost/energy observability + optimization). Close compliance loops with **attestation exports**.

---
## Scope & Deliverables

### 1) Autonomy Guardrails v2
- **Dynamic duty‑of‑care:** raise/lower thresholds based on case sensitivity, actor trust, and data label density.
- **Second‑opinion models:** shadow evaluators (rule‑based + learned) must concur for autonomous actions; disagreement → human review.
- **Action quotas & cooldowns:** per case/tenant caps; anomaly detection on action bursts.
- **Playbook lints:** static analysis warns on risky steps (wide selectors, missing warrants, unbounded loops).

### 2) Evidence Supply Chain (v1)
- **Attestation records:** signed, append‑only chain covering capture devices, transforms (OCR/ASR/ER), models used, parameters, and versions.
- **Consumer verification SDK:** verify chains client‑side; surface warnings on missing/weak attestations.
- **Evidence escrow:** escrow service for sensitive originals with release policies (warrant + approval) and escrow proofs.

### 3) Run‑at‑Scale Operations (v1)
- **Tenant migration kit:** export/import with manifest diffs, label mapping previews, and rehearsal mode.
- **Blue/green upgrades:** versioned graph and services with automated health checks and rollback runbooks.
- **Index lifecycle manager:** rolling rebuilds, warm/cold tiers, compaction windows; operator UX.

### 4) GreenOps (v1)
- **Energy/cost observability:** per‑feature energy estimates (embedding jobs, ER training, OCR/ASR, queries).
- **Carbon budgets:** per project/tenant; planner suggests lower‑footprint equivalents (sample, cache reuse, window limits).
- **Sustainable defaults:** sleep/scale‑to‑zero for idle services; batch windows aligned to low‑carbon grid signals (where available).

### 5) Legal & Compliance Attestations (v1)
- **Machine‑readable attestations:** export of control evidence bundles signed by role (CISO/DP Officer) with scope, period, and hashes.
- **Retention & erasure proofs v2:** include escrow references and downstream deletion receipts.
- **Partner consumption:** partners can verify attestations against federation artifacts.

### 6) UX and Training (v2)
- **Guardrail transparency:** UI surfaces why an action is allowed/denied (policy, safety, budget) with links to evidence.
- **Playbook Academy:** interactive simulations with counterfactuals and lints; badges for safe designs.
- **Mobile field polish:** offline queue conflict resolver, battery/perf modes, capture quality tips.

---
## Acceptance Criteria
1. **Guardrails v2**
   - Second‑opinion evaluators concur on ≥ 95% of autonomous actions; disagreements route to human review with clear rationale.
   - Action quotas/cooldowns enforced; burst anomalies alert within 60s; lint catches ≥ 90% seeded risky patterns.
2. **Evidence Supply Chain**
   - Every demo artifact carries an attestation chain (device→transforms→models→versions); SDK verifies and flags tamper.
   - Escrow releases require warrant + approval; escrow proofs included in audit bundles.
3. **Run‑at‑Scale Ops**
   - Tenant migration completes in rehearsal and live with no data loss; label mappings preview and apply; blue/green upgrade passes roll‑forward and rollback.
4. **GreenOps**
   - Energy dashboard shows per‑feature usage; carbon budgets enforced with alternative suggestions; idle scale‑to‑zero reduces baseline by ≥ 25% on staging.
5. **Compliance Attestations**
   - Signed attestation bundle exports validate; retention/erasure proofs include downstream receipts; partner verification succeeds.
6. **UX/Training**
   - Guardrail transparency live on action dialogs; Playbook Academy issues badges; mobile conflict resolver passes scripted tests.

---
## Backlog (Epics → Stories)
### EPIC BN — Autonomy Guardrails v2
- BN1. Duty‑of‑care thresholds
- BN2. Second‑opinion evaluators
- BN3. Quotas/cooldowns + burst alerts
- BN4. Playbook lints

### EPIC BO — Evidence Supply Chain
- BO1. Attestation chain format + signer
- BO2. Verification SDK
- BO3. Evidence escrow + policies

### EPIC BP — Run‑at‑Scale Ops
- BP1. Tenant migration kit
- BP2. Blue/green upgrade flows
- BP3. Index lifecycle manager

### EPIC BQ — GreenOps
- BQ1. Energy/cost telemetry
- BQ2. Carbon budgets + planner
- BQ3. Sustainable defaults

### EPIC BR — Compliance Attestations
- BR1. Machine‑readable attestations
- BR2. Erasure proofs v2
- BR3. Partner verification path

### EPIC BS — UX & Training v2
- BS1. Guardrail transparency UI
- BS2. Playbook Academy
- BS3. Field kit polish

---
## Definition of Done (Sprint 11)
- All ACs pass on a multi‑tenant staging cluster + one pilot; security/compliance sign‑off; docs updated (guardrails v2, attestation guide, migration kit, GreenOps); demo runs E2E.

---
## Demo Script
1. An autonomous **tag + snapshot** proposes action; guardrail transparency shows policy/safety/budget; second‑opinion concurs; action executes; cooldown prevents immediate repeats.
2. Evidence captured on mobile → OCR/ER → case export; **attestation chain** verifies in the SDK; escrow release simulated with warrant + approval.
3. **Tenant migration** rehearsal runs, then live cutover; blue/green upgrade performs rollback after a seeded fault; index lifecycle rebalance proceeds.
4. **GreenOps** dashboard suggests sampling + cache reuse to meet carbon budget; scale‑to‑zero cuts idle baseline.
5. **Attestation bundle** exported and verified by a partner; erasure proof v2 shows downstream receipts.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** guardrails v2, evidence chain.
- **Backend (2):** attestation signer/SDK, escrow, migrations, upgrades.
- **Frontend (2):** transparency UI, academy, mobile polish.
- **Platform (1):** energy telemetry, carbon planner, index lifecycle.
- **Security/Ombuds (0.5):** attestation scope, warrant reviews.

---
## Risks & Mitigations
- **Evaluator conflicts** → bounded autonomy; instant route‑to‑human; log for tuning.
- **Attestation sprawl** → compact chains; selective detail levels; caching.
- **Migration errors** → rehearsal mode + manifest diffs; fast rollback.
- **Energy estimates variance** → calibrate with benchmarks; confidence bands.

---
## Metrics
- Autonomy: ≥ 95% evaluator agreement; burst alerts MTTA < 1 min.
- Evidence: 100% artifacts with verifiable chains; 0 unauthorized escrow releases.
- Ops: zero data loss migrations; rollback success = 100% in drills.
- GreenOps: ≥ 25% idle energy reduction; carbon budget breach = 0.

---
## Stretch (pull if we run hot)
- **Hardware attestation** on capture devices.
- **Proof‑carrying queries** that include policy proofs with results.
- **Green SLAs** with public dashboards.

*Closing:* “Proofs on every action; restraint on every automation; efficiency on every watt.”

