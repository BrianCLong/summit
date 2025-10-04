# 🗡️ Council of Spies & Strategists — Sprint 22 Plan (Q4 2030)

> Opening: “Trust at the edge, restrain with wisdom, speak every tongue, publish what can be proven, and keep the ledger balanced.”

## Sprint Goal (14–21 days)
Extend trust and safety to the edges with **Hardware‑rooted Edge Trust**, strengthen **Autonomy Containment v2** (blast‑radius and duty‑of‑care expansions), unlock **Low‑Resource Multilingual** pipelines, stand up **Public Archives Portal** for verifiable disclosures, and mature **Economic Governance** (quotas, forecasting, charge‑back). Keep provenance, policy, and audit inviolable.

---
## Scope & Deliverables

### 1) Hardware‑Rooted Edge Trust (v2)
- **Attested capture** on Field Kit: device/OS attestation + secure time + geofencing; per‑mission key derivation; offline envelopes.
- **Edge policy pack:** warrant presets, redaction profiles, and denial‑mode defaults pushed from server; fail‑closed.
- **Edge repair flows:** corrupted local stores auto‑quarantine; self‑heal via signed delta snapshots.

### 2) Autonomy Containment v2
- **Blast‑radius guard:** static/dynamic analysis caps (# entities touched, graph diameter, data classes) before any autonomous action.
- **Duty‑of‑care escalators:** raise thresholds and require second‑opinion when risk ↑ (sensitivity, cross‑tenant, near‑boundary policies).
- **Shadow rehearsal:** dry‑run on shadow graph with predicted impacts; auto‑attach to Assurance Bundle.

### 3) Low‑Resource Multilingual (v2)
- **Transliteration/alias expansion** for non‑Latn scripts; dictionary induction from evidence.
- **On‑prem MT adapters** with quality gates and fallback to human review; provenance of transforms with BLEU/COMET‑ish confidence.
- **Cross‑lingual ER & RAG**: anchor entities across scripts; bilingual evidence cards in tri‑pane.

### 4) Public Archives Portal (v1)
- **Portal site:** browsable, searchable index of **Public Archive Bundles** with signatures, timestamps, and verifier widget.
- **Citations & redactions UI:** layered views (public, partner, internal) with evidence links; watermark per viewer.
- **Takedown & errata:** signed notices; reversible redactions; change‑log with hashes.

### 5) Economic Governance (v1)
- **Quotas & envelopes:** per‑tenant/project caps (queries, OCR/ASR, HE/MPC, embeddings); preview quotes with acceptance flow.
- **Forecasting:** time‑series models for spend vs. budget; anomaly alerts; per‑feature cost KPIs.
- **Charge‑back/Show‑back:** signed monthly reports; export to billing.

### 6) Operability & SLOs (v8)
- **Edge health:** attestation success, sync integrity, repair rates.
- **Autonomy containment:** rehearsal coverage, blocked blast‑radius attempts, duty‑of‑care escalations.
- **Multilingual quality:** translation confidence, cross‑lingual link accuracy.
- **Public portal:** uptime, verifier success, takedown SLA.
- **Economics:** forecast error, quota breach rate, user‑accepted quotes.

---
## Acceptance Criteria
1. **Edge Trust**
   - Field Kit captures include device/OS attestations, secure time, and geofence; corrupted stores auto‑quarantine and self‑heal from signed deltas.
2. **Containment v2**
   - Blast‑radius guard blocks seeded over‑broad autonomous actions with explain‑why; duty‑of‑care escalators trigger second‑opinion; shadow rehearsal attaches to Assurance Bundle.
3. **Low‑Resource Multilingual**
   - Cross‑lingual ER links aliases across at least three scripts; bilingual cards render with provenance and quality scores; human‑review fallback works.
4. **Public Archives**
   - Portal lists/searches bundles; verifier widget validates; takedown/errata workflow produces signed, auditable changes.
5. **Economic Governance**
   - Quotes preview for heavy ops; accepted quotes execute; charge‑back reports signed; forecast error within target; quotas enforce with explain‑why and override path with audit.
6. **SLOs**
   - Edge, containment, multilingual, portal, and economic SLO dashboards live and green on demo.

---
## Backlog (Epics → Stories)
### EPIC EA — Edge Trust v2
- EA1. Attested capture + envelopes
- EA2. Edge policy pack + fail‑closed
- EA3. Auto‑repair via signed deltas

### EPIC EB — Autonomy Containment v2
- EB1. Blast‑radius static analyzer
- EB2. Duty‑of‑care escalators
- EB3. Shadow rehearsal + bundle attach

### EPIC EC — Low‑Resource Multilingual v2
- EC1. Transliteration/alias induction
- EC2. MT adapters + quality gates
- EC3. Cross‑lingual ER/RAG surfaces

### EPIC ED — Public Archives Portal
- ED1. Index + verifier widget
- ED2. Redaction layers + watermarks
- ED3. Takedown/errata workflow

### EPIC EE — Economic Governance v1
- EE1. Quotas & envelopes + quotes
- EE2. Forecasting + alerts
- EE3. Charge‑back reports

### EPIC EF — Operability & SLOs v8
- EF1. Edge health dashboards
- EF2. Containment & multilingual SLOs
- EF3. Portal & economics SLOs

---
## Definition of Done (Sprint 22)
- ACs pass on staging + one field pilot and a public portal demo; security/ombuds approve containment changes and portal workflows; docs updated (edge trust v2, autonomy containment v2, multilingual SOPs, archives portal, cost governance); demo succeeds E2E.

---
## Demo Script
1. Field device captures evidence with **attestation + geofence**; a corrupted store self‑heals via signed deltas.
2. An **autonomous tag + snapshot** is blocked by blast‑radius guard; after scope reduction and second‑opinion, a dry‑run shows impacts and attaches to the bundle.
3. Analyst links entities across **Arabic, Cyrillic, and Devanagari**; bilingual evidence cards show transform provenance + quality.
4. Publish to **Public Archives Portal**; verify signatures; issue an errata with signed change‑log.
5. A heavy **HE job** shows a quote; user accepts; charge‑back report is generated; forecast tracks under budget.

---
## Roles & Allocation (suggested)
- **Tech Lead (1):** edge trust + containment.
- **Backend (2):** analyzers, quotes/charge‑back, portal runtime.
- **Frontend (2):** portal, bilingual cards, containment explains.
- **Platform (1):** signed delta repair, SLO wiring, forecasting.
- **Security/Ombuds (0.5):** policy packs, takedown/errata governance.

---
## Risks & Mitigations
- **Edge attestation drift** → cache posture, strict fail‑closed, repair tooling.
- **Containment false blocks** → readable explains, override with audit, rehearsal evidence.
- **Translation errors** → quality gates + human review; always show originals.
- **Portal abuse** → signatures, rate limits, watermarking, takedown process.
- **Cost pushback** → clear quotes, override path, budget dashboards.

---
## Metrics
- Edge: ≥ 99% attestation success; self‑heal success ≥ 98%.
- Containment: 0 unbounded autonomous actions; ≥ 95% dry‑run coverage.
- Multilingual: cross‑lingual link accuracy ≥ target; review turnaround within SLA.
- Portal: verifier success ≥ 99%; takedown MTTR within target.
- Economics: forecast MAPE within target; quota breach rate ↓.

---
## Stretch (pull if we run hot)
- **On‑device zk‑attest** for capture.
- **Containment graph diffs** visualizer for pre/post impact.
- **Community translation memory** with governance.

*Closing:* “Prove the edge, contain the machine, bridge the tongues, publish the truth, and price the craft.”