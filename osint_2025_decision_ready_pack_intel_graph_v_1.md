# OSINT 2025+ Decision‑Ready Pack — IntelGraph (v1)

_A turnkey bundle to brief leadership, align teams, run procurement, and ship the MVP. Built to go beyond the 2025 status quo with verifiable trust, federated leverage, and analyst‑first autonomy. Ethical guardrails by default; unlawful use declined and redirected to defensive alternatives._

---

## 0) Table of Contents

1. One‑Page Executive Brief
2. Capability Delta: **Beyond‑2025** (What we add that others don’t)
3. PRD (concise) — _IntelGraph OSINT Copilot & Trust Fabric_
4. Runbook Library (operational playbooks w/ KPIs)
5. Architecture & API Blueprint (100+ tools aggregator)
6. Governance, Privacy & Compliance (operational templates)
7. Evaluation & RFP Kit (scorecards, checklists)
8. Competitive Landscape (feature deltas; non‑defamatory)
9. Demo Script & Sample Data Plan
10. Delivery Plan, Milestones & KPIs

---

## 1) One‑Page Executive Brief

**Vision (1‑liner):** _A verifiable OSINT copilot on a provenance‑first graph, federating allies without moving raw data, and producing decision‑ready briefs with proofs, not promises._

**Why now:** Data volumes, anti‑scraping controls, and regulatory scrutiny are up; analysts need speed **and** trust. We deliver faster triage and deeper confidence with cryptographic provenance, explainable analytics, and policy‑bound automation.

**Core bets:**

- **Proof‑Carrying Analytics:** Every result ships with lineage, license, and model cards.
- **Zero‑Copy Federation:** Cross‑tenant checks via zero‑knowledge claims; share _proofs_, not data.
- **Analyst Augmentation:** Glass‑box agents that can be stepped, edited, and cited.
- **Governance by Design:** Authority/License compiler makes unsafe actions unexecutable.

**2‑Quarter MVP Outcomes:**

- TTI (time‑to‑insight) ↓ by 40% on labeled cases.
- False‑positive rate at triage ≤ 2% on benchmark suites.
- Evidence bundles export with verifiable manifests; 100% citation coverage.
- Live federation POC with 2 external partners (no raw PII exchange).

**Primary users:** Threat intel, DFIR, vetting/screening, fraud/AML, crisis ops, research.

---

## 2) Capability Delta — **Beyond‑2025**

> What we deliver that typical 2025 tools don’t combine in one place.

### 2.1 Verifiable Trust Fabric

- **Proof‑Carrying Queries (PCQ):** Hash tree of inputs→transforms→outputs; one‑click verifier.
- **Portable Provenance Wallets:** Time‑boxed, audience‑scoped evidence bundles (press/court/partner) with revocation.
- **License & Authority Compiler:** Compile warrants, licenses, DPAs into query bytecode; blocked actions return human‑readable reasons.

### 2.2 Federated Leverage (No‑Copy)

- **ZK Deconfliction:** Overlap checks on hashed selectors (people/assets) with zero disclosure.
- **Semantic Delta Sync:** Exchange only meaningful graph changes (motifs/claims), not raw docs.

### 2.3 Analyst‑First Autonomy

- **Glass‑Box Agents:** Full prompts, tool calls, and rationale; step/fork at any node.
- **Runbook Provers:** Each playbook emits machine‑checkable pre/post‑condition proofs (citations present, scope respected).

### 2.4 Counter‑Deception & Narrative Physics

- **Fabrication Radar:** Multi‑modal integrity checks (metadata sanity, contradiction graphs).
- **Narrative Field Maps:** Forecast spread/decay; show lowest‑risk intervention corridors.

### 2.5 Ops, Cost & Reliability

- **Unit‑Cost Governor:** $/insight indicators; cheaper equivalent plans suggested.
- **Offline Expedition Kits:** Edge analysis with CRDT sync and proof‑carrying results.

**Acceptance Targets (MVP):** p95 3‑hop graph query < 1.5s; ingest→resolve 10k docs < 5m; 0 uncited assertions in exports; revocation propagates within 15 minutes.

---

## 3) Concise PRD — _IntelGraph OSINT Copilot & Trust Fabric_

**Product Type:** Web app + APIs + deployable helm charts.

**Core Problem:** Analysts drown in data and policy risk. They need _fast, explainable, and compliant_ insight with partner leverage.

**Success Metrics:** TTI ↓40%; citation coverage 100%; export verifier pass‑rate 99%+; partner federation latency < 5s at P95 for standard queries.

### 3.1 Must‑Have Features (MVP)

1. **Ingest & Resolve**: Connectors (RSS/HTTP/S3/CSV/STIX/TAXII/MISP/CT‑logs/DNS/WHOIS); OCR/STT; ER with explainable scorecards.
   - _AC:_ CSV→entities mapped ≤10 min; lineage recorded; ER precision/recall ≥0.9/≥0.8 on gold set.
2. **Link/Map/Timeline Tri‑Pane:** Brushing + saved views; “Explain this view” panel.
   - _AC:_ Analyst completes common pivots in ≤ 6 clicks; onboarding task success ≥ 90%.
3. **PCQ + Provenance Wallets:** Verifiable exports with selective disclosure.
   - _AC:_ External verifier reproduces results within tolerance.
4. **License/Authority Compiler:** Policy tags, query‑time enforcement, human‑readable denials.
   - _AC:_ 100% policy hit‑rate on test corpus; diff simulator for proposed policy changes.
5. **Glass‑Box Agents & Runbooks:** Replayable runs, citations required; narrative builder with confidence bands.
   - _AC:_ Zero uncited claims in published briefs; replay diff shows predictable changes.
6. **ZK Deconfliction (POC):** Cross‑tenant overlap proofs without data spill.
   - _AC:_ Demonstrate true/false overlap against synthetic hashed selectors.

### 3.2 Should/Could (Post‑MVP)

- Pattern miner templates (co‑travel, structuring, cadence).
- Narrative field maps and counterfactual COA planner.
- Unit‑Cost Governor, energy‑aware scheduling.

### 3.3 Non‑Functional

- **Security:** ABAC/RBAC, OIDC, WebAuthn, field‑level crypto; audit with reason‑for‑access.
- **Reliability:** PITR, cross‑region replicas; monthly chaos drills; offline kits.
- **Compliance:** DPIA templates; purpose limitation tags; right‑to‑reply fields.

---

## 4) Runbook Library (MVP set)

Each runbook emits proofs (inputs, citations, policy) and KPIs.

- **R1. Rapid Attribution (CTI):** ingest IoCs → infra correlate (CT logs/DNS) → ATT&CK join → hypothesis.
  - _KPIs:_ TTH < 30m; precision ≥ 0.7; 100% citations.
- **R2. Phishing Cluster Discovery (DFIR):** header parse → SPF/DKIM → infra clustering → entity consolidate.
  - _KPIs:_ Cluster purity ≥ 0.8; manual workload ↓ 60%.
- **R3. Vetting & Screening (Consent‑bound):** digital footprint triage → customizable criteria → moderation cues.
  - _KPIs:_ Vetting time ≤ 2h (from 1 week baseline); explainability panel present.
- **R4. Disinformation Network Mapping:** seed narratives → burst detection → influence paths → COAs.
  - _KPIs:_ Lift in early detection ≥ 25%; risk‑of‑harm meter in briefs.
- **R5. Human Rights Incident Vetting:** media ingest → EXIF/geo helper → provenance bundle → ombuds review.
  - _KPIs:_ False allegation rate ≤ target; audit completeness 100%.
- **R6. Supply‑Chain Compromise Trace:** SBOM ingest → dependency graph → KEV overlay → blast radius.
  - _KPIs:_ MTTR ↓ 35%; coverage of critical deps ≥ 95%.
- **R7. Insider‑Risk (Consent):** selector minimization → anomaly sequences → hypothesis fork → ombuds gate.
  - _KPIs:_ False‑positive dampening ≥ 30%.
- **R8. Crisis Ops (Civic):** incident ingest → lifeline infra overlay → convoy planning → SITREP.
  - _KPIs:_ Plan time ↓ 40%; route risk scoring present.
- **R9. Dark‑Web Lead Vetting (Lawful):** licensed mirrors → risk tags → corroboration queries → confidence bands.
  - _KPIs:_ Lead discard accuracy ≥ 80%; regulator‑ready pack in 1 click.
- **R10. Zero‑Copy Alliance Check:** hashed selector exchange → ZK proof of overlap → deconfliction note.
  - _KPIs:_ Latency P95 < 5s; zero leakage in audit.

---

## 5) Architecture & API Blueprint

**5.1 Logical Components**

- **Ingestion:** Connector catalog (HTTP/RSS/S3/GCS/Azure/Kafka/AMQP/STIX/TAXII/MISP/CSV/Parquet/CT‑Logs/DNS/WHOIS). Rate‑limit policies per source. License registry.
- **Processing:** Streaming ETL with enrichers (GeoIP, language, OCR, perceptual hashes, EXIF scrub). Feature store.
- **Graph Core:** Entity/relationship ontology; temporal & bitemporal truth; geo‑temporal constructs; policy labels.
- **AI Layer:** NL→generated Cypher preview; GraphRAG with inline citations; hypothesis generator; narrative builder.
- **Trust Fabric:** PCQ service; Provenance Wallets; License/Authority Compiler; ZK‑TX (deconfliction/claims exchange).
- **Experience:** Tri‑pane UI; explain overlays; command palette; a11y AAA.
- **Ops:** OTEL traces, Prometheus metrics, SLO dashboards; cost guard; DR/BCP; offline kits.

**5.2 APIs (selected)**

- `/ingest/jobs`: create/list; schema map hints; DPIA flags.
- `/graph/query`: NL→Cypher preview; cost/row estimates.
- `/pcq/verify`: submit bundle, receive replay status.
- `/wallets/export`: audience‑scoped bundles; revocation hooks.
- `/lac/compile`: policy → bytecode; dry‑run diffs.
- `/zk/overlap`: selector proof submit/verify.

**5.3 Performance Targets**

- Query P95 < 1.5s (3 hops, 50k nodes); ingestion E2E < 5m/10k docs; federation round‑trip < 5s; verifier pass ≥ 99%.

---

## 6) Governance, Privacy & Compliance (Ops‑ready)

- **DPIA Template:** purpose, basis, data classes, minimization, retention, DSR flows.
- **Policy Packs:** jurisdictional routing, purpose limitation tags, use‑decay timers, two‑person controls.
- **Proof‑of‑Non‑Collection (PNC) Report:** monthly attestations that disallowed selectors weren’t touched (negative‑evidence commitments).
- **Ombuds Workflow:** dissent capture → quorum triggers → publication with dissent annex.
- **Disclosure Packager:** evidence + manifest + license terms; right‑to‑reply fields.

_Export gates:_ no citations → block; license conflict → block with clause reference; expired purpose → quarantine + appeal path.

---

## 7) Evaluation & RFP Kit

**7.1 Scorecard (weighting in %) **

- Trust Fabric (PCQ/Wallets/LAC): 25
- Federation (ZK‑TX/Semantic Delta): 20
- Analyst Experience (tri‑pane/Explain/agents): 20
- Performance/Scale (SLOs/offline kits): 15
- Governance (DPIA/PNC/Ombuds): 15
- TCO/Unit‑Cost Governor: 5

**7.2 Vendor Checklist**

- Sources monitored; multi‑modal coverage (text/image/audio/video)?
- Explainability: citations on every claim? Model cards retained?
- Federation: zero‑copy proofs? selective disclosure?
- Policy enforcement: compile‑time + run‑time? human‑readable denials?
- Exports: verifiable manifests? revocation supported?
- Offline: CRDT sync? proof‑carrying results?

**7.3 Test Scenarios (black‑box)**

- _Scenario A:_ Phishing cluster → acceptance targets above.
- _Scenario B:_ Vetting POC → time ≤ 2h, explainability present.
- _Scenario C:_ ZK Deconfliction → true/false overlap without leakage.

---

## 8) Competitive Landscape (Feature Deltas)

> Non‑defamatory, public‑feature comparisons; we emphasize our _adds_.

- **Social Listening Platforms (e.g., broad web/social coverage):** strong real‑time media & visual search. _Gaps we fill:_ cryptographic provenance, selective disclosure, authority compiler, no‑copy federation.
- **Automated Vetting/Screening:** strong customizable risk criteria and digital footprinting. _Gaps we fill:_ per‑claim proofs, ombuds workflows, dissent capture, portable evidence wallets.
- **Recon/Infra Mappers (DNS/WHOIS/Cert/Cloud):** strong infra pivots. _Gaps we fill:_ bitemporal truth, claims ledger, federation proofs.

---

## 9) Demo Script & Sample Data

**Demo (20 min):**

1. Ingest CSV + RSS; show DPIA flags & license registry.
2. Entity resolution; explain scorecards; temporal snapshots.
3. Tri‑pane pivot; “Explain this view.”
4. Runbook: Rapid Attribution → draft brief → citations.
5. Export Provenance Wallet; verify in external tool.
6. Partner ZK overlap demo with synthetic hashed selectors; show zero leakage.

**Sample Data:** synthetic corpora (news, IoCs, CT logs, DNS, WHOIS, social posts, images with EXIF variations) + labeled gold sets for acceptance tests.

---

## 10) Delivery Plan, Milestones & KPIs

**Team:** PM, Eng (Graph/ETL/Backend/UI/AI), Trust Fabric (crypto/OPA), SRE, Sec/Privacy, Design, Ombuds.

**Q0 (2–4 wks) — Foundations**

- Finalize ontology; spin up helm baseline; connector stubs; golden fixtures; acceptance harness.

**Q1 (8–10 wks) — MVP Core**

- Ingest/ER; tri‑pane; PCQ service; wallet export; LAC v1; 3 priority runbooks. _Exit:_ live verifier pass, R1–R3 green.

**Q2 (8–10 wks) — Federation & Autonomy**

- ZK overlap POC; glass‑box agents; disclosure packager; offline kit alpha. _Exit:_ 2‑partner federation demo; 100% cited briefs.

**KPIs to Track**

- TTI, precision/recall, verifier pass‑rate, export revocation SLA, federation latency, cost/insight, operator satisfaction (SUS ≥ 80).

---

### Appendix A — DPIA/DSR Templates (fill‑in forms)

- Purpose, legal basis, data classes, retention, minimization, DP rights flows, jurisdictional routing.

### Appendix B — Acceptance Harness (Fixture List)

- IoC set; phishing headers; DNS/WHOIS/CT snapshots; synthetic media; labeled narratives; alliance hashed selectors.

### Appendix C — MoSCoW Matrix (Backlog Summary)

- **Must:** Ingest/ER; tri‑pane; PCQ; wallets; LAC; runbooks R1–R3.
- **Should:** Pattern miner; narrative maps; unit‑cost governor; disclosure packager.
- **Could:** Energy‑aware scheduling; story causality tester; additional ZK proofs.
- **Won’t (for now):** Any modules enabling unlawful surveillance or coercion; bulk deanonymization without lawful authority and minimization.
