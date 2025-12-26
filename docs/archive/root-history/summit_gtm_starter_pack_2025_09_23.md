# Summit / IntelGraph / Maestro Conductor — GTM Starter Pack

_Last updated: Sep 23, 2025_

---

## 0) Assumptions & Inputs

- Platform name: **Summit** (IntelGraph + Maestro Conductor as modular components).
- Deployments: cloud / on‑prem / air‑gap.
- Compliance artifacts live in repo (SECURITY/ and docs/); brand assets in brands/.
- Past performance contacts: **Col. Steve Lawlor, USAF (ret.)**; **John Price**.
- Partner roster: none yet.
- Events calendar: none yet.

> **Next data needed**: contact export (CSV or LinkedIn), any redlines on pricing/packaging, confirmed reference language from Lawlor/Price, list of active dev branches tied to next 90 days.

---

## 1) CRM Bootstrap (Day 0)

**Option A (recommended): HubSpot Free** for email sync, forms, and pipeline; exportable.  
**Option B:** Airtable/Google Sheets for instant start; mirror structure and import into HubSpot later.

### Pipeline Stages (MEDDICC‑aware)

1. **Inbound/Prospect** → MQL check
2. **Qualified** (Champion/ICP fit; intro held)
3. **Discovery** (Problem, Current Tools, Data, Constraints)
4. **Pilot Proposed** (6–12 wk scope + price out)
5. **Security Review** (DPA/CMMC/FedRAMP path check)
6. **Pilot Active** (week #, success criteria tracked)
7. **Business Case** (ROI/TCO complete; sponsor sign‑off)
8. **Contracting** (vehicle/terms picked)
9. **Closed Won** / **Closed Lost** (reason codes)

### CRM Objects & Required Fields

**Accounts**

- Account Name, Segment (Gov/Prime/Enterprise/NGO), Sub‑segment, HQ City/State, Parent, Website, Data Sensitivity (Low/Med/High), Deployment Preference, Notes

**Contacts**

- First, Last, Email, Title, Role (Econ Buyer/Tech Buyer/Champion/User/Legal), Phone, LinkedIn, Account, Source, Opt‑in (Y/N)

**Opportunities**

- Name, Account, Amount (ARR), Stage, Close Date, Owner, **MEDDICC** (Metrics, Economic Buyer, Decision Criteria, Decision Process, Implications of Pain, Champion, Competition), Procurement Path (MAS/OTA/CSO/Teaming), Funding Line, Use Case, Primary Data Sources, Pilot? (Y/N), Pilot Weeks, Contract Vehicle, Win Risk (L/M/H), Next Step + Date

**Activities/Notes**

- Date, Type (Call/Email/Meeting), Summary, Next Step, Participants, Attachments link

**Product Feedback**

- Account/Contact, Category (Connector/UX/Sec/Perf/Cost), Description, Impact ($), Severity, Link to issue/PR, Status

### CSV Starter Headers (copy/paste)

**accounts.csv**  
`Account Name,Segment,Sub-segment,HQ City,HQ State,Parent,Website,Data Sensitivity,Deployment Preference,Notes`

**contacts.csv**  
`First Name,Last Name,Email,Title,Role,Phone,LinkedIn,Account,Source,Opt-in`

**opportunities.csv**  
`Opportunity Name,Account,Amount (ARR),Stage,Close Date,Owner,Metrics,Economic Buyer,Decision Criteria,Decision Process,Implications of Pain,Champion,Competition,Procurement Path,Funding Line,Use Case,Primary Data Sources,Pilot?,Pilot Weeks,Contract Vehicle,Win Risk,Next Step`

**product_feedback.csv**  
`Account,Contact,Category,Description,Impact ($),Severity,Repo Link,Status`

---

## 2) ICPs + Top Named Accounts (Draft v1)

### A) Government / Defense / Intel

**Who:** mission teams needing OSINT/all‑source fusion with provenance, ABAC/OPA guardrails, audit trails; deployable to air‑gap.  
**Titles:** Director/Chief of Analysis, J2/G2, A2/6, Fusion Center Leads, CIO/CISO, PMO leads.  
**Signals:** Active disinfo/OSINT programs, intel modernization, graph/timeline/map RFP hints, data spill/FOIA pressure.

**Named targets (seed list, expand to 100):**

- **USAF 16th Air Force (AFCYBER) — A26/Intelligence Enablement**
- **USSOCOM J2 / J5 (Tampa)**
- **CISA NRMC / JCDC**
- **DHS I&A Open Source Intelligence**
- **FBI Cyber / Counterintelligence**

**Land use cases:** OSINT fusion + provenance; TIP/STIX/TAXII ingestion to graph; analyst tri‑pane (Graph/Timeline/Map); NL→Cypher.

### B) Primes / Systems Integrators

**Who:** Capture/Program VPs, Solution Architects, Practice Leads needing a graph/AI substrate with compliance‑by‑design.  
**Signals:** Pursuits mentioning OSINT/graph/AI guardrails; need for SBOM/SLSA & policy‑gated AI; GraphQL/REST integration velocity.

**Named targets (seed list):** SAIC, Booz Allen, Leidos, CACI, Accenture Federal, KBR, Jacobs, Palantir‑partner SIs (for displacement/adjacent wins).

**Partner motion:** “Better Together” diagram + 20% referral / 10–25% resell margin; 2‑week spike plan; co‑sell into above Gov list.

### C) Regulated Enterprise (FSI/Healthcare/Energy/Critical Infra)

**Who:** Threat Intel, Fraud, Insider Risk, Supply‑Chain Risk.  
**Signals:** SIEM/SOAR fatigue, dark‑web/brand‑risk programs, third‑party risk expansion, repeated compliance audits.

**Land use cases:** Threat intel enrichment; fraud rings graph; vendor risk graph; provenance‑first AI responses with audit trails.

### D) NGOs / Think Tanks / Journalism

**Who:** Disinfo/IO tracking teams; investigative journalism desks; human rights orgs with verification needs.  
**Land use cases:** Campaign/portfolio risk maps; source provenance; collaboration spaces with redaction.

---

## 3) Pilot Offer & Pricing (Draft)

**Offer:** 6–12 week paid pilot.

- **Scope:** ingest 2–4 data sources (e.g., OSINT APIs, PDFs, CSVs, STIX/TAXII), configure tri‑pane UI (Graph/Timeline/Map), enable NL→Cypher, set policy guardrails (ABAC/OPA), build 2–3 mission workflows.
- **Success criteria:** time‑to‑insight ↓ by ≥40%; provenance coverage ≥95% of ingested items; zero critical audit findings; champion NPS ≥8; user adoption ≥10 weekly actives.
- **Pricing:** $45k (6 wks) / $80k (10 wks) / $95k (12 wks). Government rates T&M‑equivalent; enterprise list with 10% prepay discount.
- **Ramp to production:** credit 50% of pilot fee to Year‑1 if signed within 60 days of exit.
- **Deployment:** cloud (default) or on‑prem/air‑gap surcharge (+20%) to cover support.

**Security review pack (included):** SBOM pointer, data handling, DLP/OPA guardrails, audit logs examples, FedRAMP path, CMMC posture.

---

## 4) Compliance Field Kit (Skeleton)

- **SBOM & SLSA:** component list, build provenance, and attestation template.
- **Data Handling & Privacy:** classification, retention, redaction, privacy modes, DLP enforcement.
- **Access Control:** ABAC with OPA policies; multi‑tenant governance.
- **Auditability:** chain‑of‑custody, explainability, exportable audit logs.
- **Security Testing:** ZAP/Grafana dashboards and weekly vuln scan procedure.
- **Regulatory Map:** CMMC readiness checklist; FedRAMP trajectory; ITAR/export‑control screening; DPIA/DPA templates.

> **Links to maintain in pack:** SECURITY/ directory, docs/ security whitepaper, brands/ templates, example audit logs.

---

## 5) Executive Deck — 6–8 Slide Outline

1. **Mission & Problem:** OSINT/all‑source chaos → unverifiable AI → risk.
2. **Summit in 1 slide:** Provenance‑first Graph + Policy‑gated AI; tri‑pane UI; deploy anywhere.
3. **Value Pillars:** Provenance/Audit; Analyst Velocity; Compliance‑by‑Design; Interoperability; Cost Control.
4. **Reference Architectures:** connectors → graph service → governance/ABAC → UI; cloud/on‑prem/air‑gap patterns.
5. **Evidence:** pilot metrics, sample timelines/graphs, screenshots.
6. **Compliance Map:** SBOM/SLSA, DLP/OPA, audit logs; CMMC/FedRAMP path.
7. **Commercials:** pilot offer, ramp, vehicles/teaming for Gov.
8. **Next Steps:** 2‑week technical spike or pilot start; team & timeline.

---

## 6) One‑Pager (Customer‑Facing) — Draft Copy

**Headline:** _Provenance‑first Intelligence Graph & Policy‑Gated AI_  
**What it is:** Summit unifies documents, OSINT feeds, and operational data into a verifiable graph with timeline and map views. Natural‑language to graph queries (NL→Cypher) and workflow orchestration boost analyst throughput while ABAC/OPA guardrails and redaction modes keep data compliant. Deploy in cloud, on‑prem, or air‑gapped.

**Why it wins:**

- **Trust:** Every fact has provenance and audit.
- **Speed:** Tri‑pane (Graph/Timeline/Map) accelerates analysis.
- **Control:** ABAC/OPA, DLP, privacy modes.
- **Open & Interoperable:** STIX/TAXII, APIs/SDKs, connectors.
- **Practical:** Observability/SLOs, cost budgets, deploy anywhere.

**Land → Expand:** 6–12 week pilot → role‑based seats + usage tiers; multi‑year pricing with ramp.

**Compliance:** SBOM/SLSA, audit logs, CMMC readiness, FedRAMP path.

**Contact:** hello@ (placeholder) | summit.example (placeholder)

---

## 7) Outreach Kits (Email + LinkedIn) — v1

### A) Government / Intel — Analyst & Mission Lead

**Email 1 (value + ask):**  
_Subject:_ Provenance‑first OSINT → faster, auditable intel  
Hi {{First}}, we’re helping mission teams fuse OSINT/docs into a verifiable **graph + timeline + map** with **policy‑gated AI**. Teams cut time‑to‑insight ~40% while improving provenance coverage. If {{Org}} is pushing on OSINT/modernization, worth a 20‑min look? 3 slots next week.

**Email 2 (proof + pilot):**  
Subject: Your OSINT → graph in 2 weeks  
We ingest STIX/TAXII, docs, and web sources; NL→Cypher answers with provenance; ABAC/OPA locks it down. We can stand up a **6–12 week pilot** (2–4 sources; 2–3 workflows). Interested in scoping?

**Email 3 (compliance + route‑to‑yes):**  
Subject: Fast lane (OTA/CSO) + security pack  
We have SBOM/SLSA, DLP/OPA, audit logs, and a FedRAMP path. We can go via OTA/CSO with a prime if easier. Open to discuss?

**LinkedIn DM (short):**  
Provenance‑first **intel graph + policy‑gated AI** — tri‑pane UI. Happy to show how teams cut time‑to‑insight ~40% with audit trails. 15–20 min?

### B) Primes / SIs — Capture & Solution Leads

**Email 1:**  
Subject: Better‑together for graph/AI pursuits  
We slot in as the **graph/AI substrate** (provenance, ABAC/OPA, NL→Cypher) to accelerate delivery and compliance. Have 1–2 pursuits where this can lift win probability?

**Email 2:**  
Subject: 2‑week spike plan + margins  
We’ll deliver a reference architecture + demo aligned to your pursuit in **2 weeks**. Referral (20%) or resell (10–25%) options.

**Email 3:**  
Subject: Discriminators where we help you win  
Provenance/audit, policy guardrails, deploy‑anywhere. Quick fit call?

**LinkedIn DM:**  
We help primes deliver compliant graph/AI faster (provenance, ABAC/OPA, NL→Cypher). Have a pursuit we should backstop?

### C) Regulated Enterprise — Threat/Fraud Leads

**Email 1:**  
Subject: Verified AI for threat intel/fraud graphs  
We unify feeds/docs to a verifiable graph; NL queries with audit; deploy anywhere. Worth a 20‑min look?

---

## 8) Capture Brief Template (1‑Pager)

**Target:** {{Agency/Program/Prime}}  
**Mission Need:** {{stated pain; current tools}}  
**Funding & Timing:** {{FY line; obligation window; key dates}}  
**Procurement Path:** {{GSA/SEWP/OTA/CSO/BAA/Teaming}}  
**Stakeholders:** {{econ buyer; tech buyer; champion; users; legal/compliance}}  
**Incumbent & Competitors:** {{who; strengths/weaknesses}}  
**Discriminators:** Provenance/Audit; ABAC/OPA; NL→Cypher; tri‑pane UI; deploy anywhere; cost control.  
**Solution Sketch:** {{connectors; workflows; deployment}}  
**Risks & Mitigations:** {{security; data; change mgmt}}  
**30/60/90 Plan:** {{meetings; spike; pilot; vehicle}}  
**Next Actions & Owners:** {{who; date}}

---

## 9) Product Roadmap (Next 90 Days) — Draft Themes

> **Source of truth:** engineering repo boards/issues; align weekly.

**Theme 1 — Provenance & Audit:** richer chain‑of‑custody views; exportable audit bundles; SBOM automation.  
**Theme 2 — Analyst Velocity:** NL→Cypher improvements; tri‑pane UX polish; saved playbooks; timeline diffing.  
**Theme 3 — Compliance‑by‑Design:** OPA policy packs; per‑tenant DLP; privacy/redaction modes; role/attribute presets for Gov.  
**Theme 4 — Interoperability:** new **STIX/TAXII** and OSINT connectors; tip ingestion; document/media parsing; GraphQL/REST hardening.  
**Theme 5 — Deploy Anywhere:** on‑prem/air‑gap helm charts; observability/SLOs; cost budgets and guardrails.

**Release cadence:** bi‑weekly increments; monthly field notes to Sales; attach $$ impact to each item.

---

## 10) Evidence Pack Checklist

- 1‑page capability statement (Gov + Commercial variants)
- 2 short demo videos (2–3 min): OSINT→Graph; NL→Cypher with provenance
- Sample audit logs + policy pack
- Pilot success metrics sheet & ROI/TCO calculator
- Reference quotes (Lawlor/Price) — get approvals

---

## 11) Weekly Operating Cadence

- **Pipeline report:** coverage ≥3× target; stage conversions; cycle time; top 10 at‑risk with unblockers.
- **Product feedback packet:** top 5 asks with $$ impact; links to issues/PRs; status.
- **Partner scorecard:** sourced/influenced pipeline; pursuits; actions.

---

## 12) Next Steps (Today → 2 Weeks)

**Today:** load contacts; stand up pipeline; send 10 tailored outreaches (Gov + Prime).  
**Week 1:** book 5 discovery calls; draft 2 capture briefs; confirm pilot pricing guardrails; assemble Compliance Field Kit links.  
**Week 2:** run 1–2 technical spikes; finalize exec deck; float pilot proposals to 2 accounts; identify 2 prime pursuits.
