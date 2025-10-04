# 🗡️ Council of Spies & Strategists — Sprint 12 Plan (Q2 2028)

> Opening: “Do not mistake pattern for cause. Name the cause, show the proof, and light the path for oversight.”

## Sprint Goal (14–21 days)
Advance the platform from correlation‑driven insights to **causal reasoning** and strengthen **insider defense** while expanding **public‑facing transparency** and **product lifecycle mastery** (deprecation, migrations, archival science). Lock in long‑horizon maintenance and upgrade the Council’s ethical posture.

---
## Scope & Deliverables

### 1) Causal Graphs & Temporal Inference (v1)
- **Event calculus & SCMs:** encode interventions and counterfactuals on the graph using **structural causal models** (SCMs) with time bounds.
- **Do‑queries (read‑only):** simulate effects under policy‑safe interventions on a shadow graph; report causal effect ranges with assumptions and instrument variables.
- **Causal provenance:** every estimate carries assumptions, back‑door sets, and sensitivity to unobserved confounders.

### 2) Insider Defense & Access Analytics (v1)
- **Access motifs:** detect unusual traversal patterns, out‑of‑jurisdiction reads, rapid redaction reveals, and query cost spikes by identity/device.
- **Risk tiers & just‑in‑time auth:** step‑up prompts for risky actions; device posture + reason‑for‑access reinforcement.
- **Case linkage:** suspicious sessions auto‑open an **Insider Review** case with evidence bundle and timeline.

### 3) Transparency & Public Disclosures (v1)
- **Redactable reports:** publishable briefs with layered redactions and public proofs (hashes, manifests, policy statements).
- **Public verifier:** lightweight web verifier for disclosure bundles (no secrets) that checks signatures, timestamps, and provenance hashes.
- **Ethical accountability:** attach purpose statements, legal basis, and model cards to published findings.

### 4) Lifecycle Mastery & Deprecation (v1)
- **Deprecation policy engine:** feature flags with sunset dates, migration paths, and user‑level impact previews.
- **Archive science:** signed cold archives with format migrations, fixity checks, and retrieval SLAs; auto‑generate archival finding aids.
- **Breaking change simulator:** detect downstream blast radius in connectors, runbooks, and policies before upgrades.

### 5) Knowledge Distillation & Model Stewardship (v1)
- **Distill heavy models** (embeddings/anomaly) into small on‑prem/runtime‑safe versions; quality deltas reported.
- **Model escrow:** escrow encrypted weights & configs with reconstitution procedure and legal controls.
- **End‑of‑life playbooks:** retirement, rollback, and lineage marking for deprecated models.

### 6) UX & Enablement (v3)
- **Causal UI:** do‑query builder with assumptions checklist; counterfactual storyboards linked to evidence.
- **Insider dashboard:** risk scores, event timelines, remediation workflows.
- **Public disclosure studio:** compose, redact, sign, and generate verifier links.

---
## Acceptance Criteria
1. **Causal**
   - Do‑queries run on a shadow graph with explicit assumptions/back‑door sets; results show effect ranges and sensitivity; no live data mutation.
   - Counterfactual storyboard exports into the disclosure bundle with citations.
2. **Insider Defense**
   - Access anomalies detected on scripted scenarios; step‑up auth triggers; Insider Review case auto‑opens and aggregates evidence.
3. **Transparency**
   - Public verifier validates a demo disclosure bundle; public brief shows layered redactions and proofs without leaking restricted data.
4. **Lifecycle**
   - A feature reaches sunset with migration wizard; breaking change simulator flags dependent assets; archives pass fixity checks.
5. **Model Stewardship**
   - Distilled model achieves ≥ 90% of baseline quality on eval set; model escrow package verifies; EOL playbook executes with lineage update.
6. **UX**
   - Causal builder, insider dashboard, and disclosure studio complete primary flows; all actions are policy‑explained and audited.

---
## Backlog (Epics → Stories)
### EPIC BT — Causal & Temporal
- BT1. SCM data structures + APIs
- BT2. Do‑query engine (shadow)
- BT3. Sensitivity & assumptions
- BT4. Counterfactual storyboard + export

### EPIC BU — Insider Defense
- BU1. Access motif detectors
- BU2. Step‑up auth + device posture
- BU3. Insider Review case flows

### EPIC BV — Transparency & Verifier
- BV1. Redactable report composer
- BV2. Public verifier site + SDK
- BV3. Ethics/purpose statements + model cards

### EPIC BW — Lifecycle & Deprecation
- BW1. Deprecation flags + sunsets
- BW2. Archive science + finding aids
- BW3. Breaking change simulator

### EPIC BX — Distillation & Stewardship
- BX1. Distillation pipelines
- BX2. Model escrow + reconstitution
- BX3. Model EOL playbooks

### EPIC BY — UX & Enablement v3
- BY1. Causal builder UX
- BY2. Insider dashboard
- BY3. Disclosure studio polish

---
## Definition of Done (Sprint 12)
- ACs pass on staging; security/ombuds sign off on transparency flows; docs updated (causal guide, insider SOPs, disclosure policy, deprecation handbook, model stewardship); demo succeeds end‑to‑end.

---
## Demo Script
1. Analyst uses **causal builder** to run a do‑query; storyboard shows counterfactuals with assumptions and sensitivity; export to disclosure.
2. A simulated **insider pattern** triggers step‑up auth; evidence flows into an Insider Review case; remediation tracked.
3. Team publishes a **public brief** with layered redactions; external party verifies it with the **public verifier**.
4. A feature sunset runs through the **migration wizard**; archives created with fixity proof; breaking‑change simulator flags two runbooks.
5. A large embedding model is **distilled**; quality delta displayed; escrow package verified; EOL playbook retires the old model.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** causal engine, transparency architecture.
- **ML Eng (1):** SCM/do‑queries, distillation.
- **Backend (2):** insider detectors, archives, verifier.
- **Frontend (2):** causal UI, insider dashboard, disclosure studio.
- **Platform (1):** archives, fixity, sunset/enforcement.
- **Security/Ombuds (0.5):** ethics statements, public proofs, insider SOP.

---
## Risks & Mitigations
- **Causal misinterpretation** → assumption checklists, sensitivity reports, and explicit non‑guarantee language; training.
- **Insider false positives** → combine device posture + reason prompts; analyst review stage.
- **Transparency leakage** → layered redactions + public‑only proofs; verifier tests.
- **Migration fatigue** → previews, automated wizards, staged rollouts.

---
## Metrics
- Causal: ≥ 80% of targeted questions expressed as do‑queries; zero live data mutations.
- Insider: ≥ 90% detection on scripted insider scenarios; ≤ 5% false‑positive alert rate on baseline.
- Transparency: 100% public bundles verifiable; zero restricted data leaks in spot checks.
- Lifecycle: 100% sunset features with migration paths; archives pass fixity 100%.
- Stewardship: ≥ 1 distilled model in production with ≥ 90% quality retention.

---
## Stretch (pull if we run hot)
- **Instrumental variable discovery** helper for causal builder.
- **Homomorphic encryption pilot** for select aggregates.
- **Public transparency portal** with live attestation feeds.

*Closing:* “Name the cause, prove the chain, and leave a verifiable trail.”