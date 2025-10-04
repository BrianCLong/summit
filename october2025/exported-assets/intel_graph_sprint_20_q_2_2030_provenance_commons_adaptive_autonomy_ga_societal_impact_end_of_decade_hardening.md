# 🗡️ Council of Spies & Strategists — Sprint 20 Plan (Q2 2030)

> Opening: “Make provenance common, give autonomy a conscience, measure our footprint, and harden for the long dusk.”

## Sprint Goal (14–21 days)
Establish a **Provenance Commons** for cross‑ecosystem evidence verification, bring **Adaptive Autonomy** to **GA** with explicit guardrails and post‑action audits, operationalize **Societal Impact & Ethics** (bias, rights, safety) with measurable controls, and land **End‑of‑Decade Hardening** (availability, cost predictability, sunsetting). Prepare for a long maintenance arc.

---
## Scope & Deliverables

### 1) Provenance Commons (v1)
- **Open verifier kit:** portable CLI/SDK + web widget for verifying disclosure/assurance bundles, manifests, ZK/DP proofs, PQC signatures.
- **Evidence registries:** optional public hash registries for non‑sensitive artifacts (e.g., documents’ content hashes, watermark fingerprints) with revocation.
- **Commons governance:** terms, submission rules, auditability guarantees, abuse reporting, and transparency counters.

### 2) Adaptive Autonomy GA (v2)
- **Personalized risk profiles:** thresholds adapt to analyst trust, case criticality, and data label density; cooldowns & quotas enforced.
- **Outcome audits:** each autonomous action spawns a scheduled audit (T+24h) with counterfactual check and human acknowledgment.
- **Action markets (internal):** narrow, pre‑approved automations published with evidence requirements, budgets, and rollback recipes.

### 3) Societal Impact & Ethics (v1)
- **Risk register:** bias, disparate impact, explainability, privacy leakage, and misuse risks per feature with owners and mitigations.
- **Rights workflow:** data subject request (DSR) handling for access/correction/erasure with proof of action and scope limits.
- **Safety drills:** content‑safety tests on public disclosures; redaction correctness audits; incident templates for harm claims.

### 4) End‑of‑Decade Hardening (v1)
- **Availability tiers:** automated failover runbooks, quorum rules, and DR tests for each edition (Community/Pro/Enterprise/Gov/Sovereign).
- **Predictable costing:** budget envelopes, advance quotes for heavy queries (embeddings, HE/MPC, OCR), and enforcement with overrides and audit.
- **Sunsetting program:** long‑term EOL calendars for features/models/connectors; notice tooling; migration assistants.

### 5) Education & Outreach (v1)
- **Provenance literacy:** interactive tutorials and public docs on proofs, manifests, and verification.
- **Analyst ethics labs:** scenario‑based learning for autonomy decisions, redaction, and disclosure choices.
- **Partner enablement:** quick‑start packs for verifying bundles, treaties, and contracts.

### 6) Operability & SLOs (v6)
- **Commons SLOs:** verifier uptime, registry response, proof verification success/freshness.
- **Autonomy SLOs:** audit completion rate, rollback MTTR, action disagreement rate.
- **Societal SLOs:** DSR response time, redaction accuracy, incident time‑to‑ack.

---
## Acceptance Criteria
1. **Provenance Commons**
   - Public verifier widget and CLI validate demo bundles with PQC/ZK/DP; public hash registry accepts/revokes entries with audit.
2. **Adaptive Autonomy GA**
   - Personalized thresholds active; outcome audits scheduled and acknowledged; action market lists ≥ 5 narrow automations with evidence rules.
3. **Societal Impact**
   - Risk register published internally with owners/mitigations; DSR workflow executes with proofs; redaction audit catches seeded errors.
4. **Hardening**
   - Edition‑specific failover drills pass; budget envelopes produce advance quotes and block overruns with explain‑why + override path; sunsetting tool emits notices and migration plans.
5. **Education/Outreach**
   - Tutorials live; partner enablement kit completes verification on test bundles and treaties.
6. **Operability**
   - SLO dashboards for Commons, Autonomy, and Societal Impact running; alerts wired to on‑call.

---
## Backlog (Epics → Stories)
### EPIC DO — Provenance Commons
- DO1. Open verifier CLI/SDK/widget
- DO2. Public hash registries + revocation
- DO3. Governance + transparency counters

### EPIC DP — Adaptive Autonomy GA v2
- DP1. Personalized thresholds + quotas
- DP2. Outcome audits + counterfactuals
- DP3. Action market + rollback recipes

### EPIC DQ — Societal Impact & Ethics
- DQ1. Risk register + mitigations
- DQ2. DSR workflow + proofs
- DQ3. Redaction audit + safety drills

### EPIC DR — End‑of‑Decade Hardening
- DR1. Availability tiers + DR drills
- DR2. Predictable costing + quotes
- DR3. Sunsetting calendars + assistants

### EPIC DS — Education & Outreach
- DS1. Provenance literacy tutorials
- DS2. Analyst ethics labs
- DS3. Partner enablement kits

### EPIC DT — Operability & SLOs v6
- DT1. Commons SLOs + dashboards
- DT2. Autonomy SLOs + audits
- DT3. Societal SLOs + alerts

---
## Definition of Done (Sprint 20)
- ACs pass on multi‑tenant staging, one partner, and a public demo page; security/ombuds sign off; docs updated (Provenance Commons guide, autonomy GA safety case v2, DSR SOP, DR playbooks, costing handbook); demo succeeds end‑to‑end.

---
## Demo Script
1. Publish a disclosure with **Assurance Bundle**; third party uses the **Commons widget** to verify PQC+ZK+DP proofs; registry shows public hash.
2. Execute a **narrow autonomous action** from the market; personalized thresholds allow; T+24h outcome audit confirms; counterfactual passes.
3. Submit a **DSR**; system finds data, redacts appropriately, exports proof of action; redaction audit flags and we repair a seeded issue.
4. Trigger **failover drill** for Enterprise edition; budget envelope blocks an HE job until accepted quote; sunsetting assistant migrates a deprecated connector.
5. Walk through **provenance literacy tutorial**; partner kit verifies a treaty and a disclosure bundle.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** Commons architecture, autonomy GA.
- **Backend (2):** verifier/registry, DSR/redaction audit, costing engine.
- **Frontend (2):** widget, action market, tutorials/dashboards.
- **Platform (1):** DR drills, SLO wiring, sunsetting tools.
- **Security/Ombuds (0.5):** governance, ethics labs, DSR policy.

---
## Risks & Mitigations
- **Public registry abuse** → rate limits, signatures, revocation, moderation.
- **Autonomy drift** → outcome audits + counterfactuals; rollback recipes; quotas.
- **DSR complexity** → scoped searches, proof exports, clear denials when lawful basis lacking.
- **Cost surprises** → advance quotes + envelopes; override only with audit.

---
## Metrics
- Commons: ≥ 99.9% verifier uptime; ≥ 99% proof verification success.
- Autonomy: 100% actions audited; rollback MTTR ≤ 5 min; disagreement rate tracked.
- Societal: DSR median completion < target; redaction audit pass rate ≥ target; incident TTA ≤ target.
- Hardening: DR drill pass rate 100%; cost overrun incidents ↓ ≥ 30%.

---
## Stretch (pull if we run hot)
- **Community provenance portal** with signed badges for verified disclosures.
- **Autonomy reputation scores** per action template.
- **Sunset autopilot** with usage‑aware suggestions.

*Closing:* “Provenance for all, autonomy with conscience, systems that endure, and choices we can defend.”