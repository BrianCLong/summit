````markdown
# Sprint 2025-09-29 — Capture, Compliance & Partnering Pack

**Slug/Version:** `sprint-2025-09-29-intelgraph-capture-compliance-v1.0.0`
**Owner:** Felix (The B.I.Z.)
**Date:** Sep 29, 2025

> Assumptions: No signed pilots yet; target sectors = Gov/Defense/Intel + Regulated Enterprise. Replace placeholders with real program names/funding lines as intel is confirmed.

---

## 1) Capture Brief Template (Gov/Prime)

Path: `docs/gtm/capture/BRIEF_TEMPLATE.md`

```markdown
# Capture Brief — {{Agency/Program}}

**Mission Need:** (1–2 sentences)
**Outcome by Q+2:** (what success looks like)
**Funding Line / Vehicle:** (program, FY, vehicle/OTA/CSO/IDIQ)
**Timeline:** (RFI/RFP dates, demo windows)
**Stakeholders:** (CO, COR/PM, Technical, Champion, Users)
**Incumbent / Competition:** (who + posture)
**Pain → Discriminators:** (status quo gaps → why us)
**Teaming Map:** (prime, subs, labs, ISVs)
**Offer:** (pilot scope, price, procurement path)
**Risks & Mitigations:**
**Next 30/60/90:** (dated tasks)
```
````

---

## 2) Five Target Capture Briefs (Draft)

Path: `docs/gtm/capture/*`

### 2.1 CISA / Threat Intel Fusion (Draft)

File: `docs/gtm/capture/BRIEF_CISA_TIF.md`

- **Mission Need:** Fuse OSINT + internal alerts to detect emerging infra threats; full provenance & audit.
- **Outcome by Q+2:** 8‑week pilot in a DHS VPC; 10 analysts; TTI P50 ≤ 5m on Splunk + CSV.
- **Funding/Vehicle:** FY25 ops; **OTA via DHS‑friendly consortium** (assumed) or CSO.
- **Stakeholders:** CO: TBD; Tech: Joint Cyber Defense Collaborative (JCDC) lead; Champion: Branch Chief (threat intel).
- **Competition:** Palantir, Elastic, Recorded Future. **Discriminators:** policy‑gated AI, NL→Cypher, tamper‑evident audit.
- **Teaming:** SI with DHS past perf; cloud VPC partner.
- **Offer:** 8‑week pilot, $75k fixed; evidence bundle.
- **Next 30/60/90:**
  - **By Oct 7:** intro via partner; validate vehicle.
  - **By Oct 21:** security review packet; demo.
  - **By Nov 15:** pilot start.

### 2.2 USAF / 16th Air Force (Cyber) — OSINT Fusion

File: `docs/gtm/capture/BRIEF_USAF_16AF.md`

- **Mission Need:** Open‑source indicators → entity graph mapped to mission networks; air‑gap‑capable pattern.
- **Vehicle:** CRADA→OTA or direct via prime on existing IDIQ.
- **Discriminators:** air‑gap deploy, ABAC/OPA, provenance.
- **Next 30/60/90:** identify prime, map to authority‑to‑operate pathway.

### 2.3 SOCOM J2X — Partner Force Vetting

File: `docs/gtm/capture/BRIEF_SOCOM_J2X.md`

- **Mission Need:** Vetting & relationship graphs with explainable AI and strict audit.
- **Vehicle:** OTA via SOCOM consortia or prime teaming.
- **Risks:** data sensitivity (ITAR/NOFORN) → export screen & privacy modes.

### 2.4 FBI Cyber Division — Fraud/Threat GraphRAG

File: `docs/gtm/capture/BRIEF_FBI_CYBER.md`

- **Mission Need:** Cross‑case entity unification; policy‑gated summarization for deconfliction.
- **Vehicle:** CSO or via DOJ vehicles with partner prime.

### 2.5 DOE CESER — Critical Infrastructure Intel

File: `docs/gtm/capture/BRIEF_DOE_CESER.md`

- **Mission Need:** Grid incident intel; provenance‑first analytics; deploy in DOE VPC.
- **Vehicle:** Lab CRADA → production via prime.

> **Data Needed Next:** specific POCs, vehicles/IDIQs, and FY windows. Replace assumptions as we engage.

---

## 3) Teaming Map & Discriminators Matrix

Path: `docs/gtm/capture/TEAMING_AND_DISCRIMINATORS.md`

```markdown
# Teaming Map

- **Primes/SIs:** {{Prime A}}, {{Prime B}}
- **ISVs/Data:** Splunk, AWS/S3, Reddit OSINT
- **Labs/Academia:** {{Lab}}

# Discriminators Matrix

| Requirement        | Summit Capability            | Evidence         | Gap         | Mitigation   |
| ------------------ | ---------------------------- | ---------------- | ----------- | ------------ |
| Provenance & audit | Hash‑chained audit, SBOM     | Demo, whitepaper | —           | —            |
| ABAC/OPA           | Rego bundles, gateway hook   | Policy tests     | Perf P95    | cache OPA    |
| GraphRAG           | NL→Cypher, citations         | Golden path      | Quality     | eval harness |
| Deploy models      | VPC/on‑prem/air‑gap patterns | Runbooks         | Air‑gap pkg | partner lab  |
```

---

## 4) Bid/No‑Bid Memo Template

Path: `docs/gtm/capture/BID_NOBID_TEMPLATE.md`

```markdown
# Bid/No‑Bid — {{Opportunity}}

**Date:** {{YYYY‑MM‑DD}}
**Type:** RFI / RFP / CSO / OTA / CRADA
**Go/No‑Go Factors:** (Customer fit, funding, timeline, discriminators, team, risk)
**Score:** (0–5 each) — Total ≥ 18/25 to Bid
**Decision:** BID / NO‑BID
**Owners & Next Steps:** (with dates)
```

---

## 5) Compliance Field Kit (Structure + Stubs)

Path: `docs/compliance/*`

```
compliance/
  ai_responsible_use.md
  data_handling.md
  security_whitepaper.md
  cmmc_map.md
  fedramp_path.md
  ssdf_checklist.md
  export_control.md
  dpa_template.md
  dpia_template.md
```

### 5.1 CMMC Map (Rev A) — `docs/compliance/cmmc_map.md`

```markdown
# CMMC Readiness Map (Rev A)

- **Scope:** product & pilot environments
- **Level Target:** 2 (Foundational)
- **Controls Coverage:**
  - Access Control (AC): ABAC via OPA; MFA SSO; least privilege
  - Audit & Accountability (AU): immutable audit log; centralized logging
  - Configuration Mgmt (CM): IaC, code review, SBOM
  - Identification & Auth (IA): SSO/JWT, key mgmt
  - Incident Response (IR): runbook, contact tree
  - Risk Mgmt (RM): weekly review; vendor scans
- **Gaps/Roadmap:** POA&M table with owners/dates
```

### 5.2 FedRAMP Path (Rev A) — `docs/compliance/fedramp_path.md`

```markdown
# FedRAMP Path (Rev A)

- **Current Mode:** pilot in customer VPC (sponsor boundary)
- **Near‑term:** Moderate‑equivalent controls; SSP-lite for pilots
- **Longer‑term:** Agency sponsorship → Moderate ATO; 3PAO selection checklist
```

### 5.3 SSDF Checklist — `docs/compliance/ssdf_checklist.md`

```markdown
# NIST SSDF v1.1 Checklist

- Secure Build: SBOM (CycloneDX), SLSA provenance stub
- Secure Release: signed containers; provenance metadata
- Vulnerability Mgmt: CodeQL, Trivy, dependency updates
- Policy: OPA tests in CI
```

### 5.4 Export Control — `docs/compliance/export_control.md`

```markdown
# Export/ITAR Stance

- Data classification table; NOFORN/ITAR handling
- Engineer export screening; access controls
- Pilot data localization options
```

---

## 6) Product Requests w/ Revenue Impact

Path: `reports/product_requests_backlog.md`

```markdown
# Product Requests (Revenue‑Tagged)

| ID     | Request               | Segment        | Deals Affected | Est. ARR Impact | Effort | Priority |
| ------ | --------------------- | -------------- | -------------- | --------------: | ------ | -------- |
| PR‑001 | NL→Cypher approval UX | Gov/Enterprise | 3              |           $450k | M      | P1       |
| PR‑002 | Splunk auth variants  | Gov            | 2              |           $250k | S      | P0       |
| PR‑003 | Air‑gap deploy script | Defense        | 1              |           $150k | M      | P1       |
```

---

## 7) Pipeline Board (Initial Seeds)

Path: `reports/pipeline_board.md`

```markdown
# Named Accounts (Initial)

- CISA TIF — Stage: Discover — Next: vehicle validation (Oct 7) — Owner: Felix
- USAF 16AF — Stage: Partnering — Next: prime shortlist (Oct 9) — Owner: Felix
- SOCOM J2X — Stage: Discover — Next: export stance review (Oct 8) — Owner: SecEng
- FBI Cyber — Stage: Discover — Next: DOJ vehicle mapping (Oct 10) — Owner: Felix
- DOE CESER — Stage: Intro — Next: lab CRADA talk (Oct 11) — Owner: Felix
```

---

## 8) MEDDICC / CHAMP Qual Kit

Path: `docs/gtm/qualification_checklist.md`

```markdown
# Qualification Checklist (MEDDICC + CHAMP)

- **Metrics:** TTI, auditability, latency
- **Economic Buyer:** {{name}}
- **Decision Criteria:** provenance, compliance, deploy model
- **Decision Process:** security review → pilot MOU → SOW
- **Identify Pain:** slow fusion, audit gaps
- **Champion:** {{name}}
- **Competition:** incumbents listed per brief
- **Challenges, Authority, Money, Prioritization:** capture notes here
```

---

## 9) “Better Together” One‑Pager (Text + ASCII diagram)

Path: `docs/gtm/partners/better_together_splunk.md`

```markdown
# Better Together: Summit × Splunk

**Value:** Bring Splunk events into IntelGraph; ask NL questions; get grounded, policy‑gated answers.
```

flowchart TD
A[Splunk Search API] --> B[Connector]
B --> C[Ingestion Registry + Provenance]
C --> D[IntelGraph]
D --> E[GraphRAG Orchestrator]
E --> F[Investigator UI]
F -->|Audit| G[Hash‑Chained Log]

```

**Why Splunk:** ubiquity in SOCs; immediate time‑to‑value.
**Security:** read‑only search; provenance per batch; OPA at query.
```

---

## 10) Demo Evidence Checklist

Path: `docs/evidence/demo_checklist.md`

```markdown
# Demo Evidence — Oct 14

- [ ] Golden path video (≤ 6 min)
- [ ] e2e test report
- [ ] SBOM file present
- [ ] Policy decisions log sample
- [ ] Dashboards screenshots (OTel, SLO)
- [ ] Pilot offer PDF
```

---

## 11) Daily Execution Cadence (Sprint)

Path: `reports/daily_checklist.md`

```markdown
# Daily Checklist (09:30 MT)

- Blockers by swimlane
- Top 3 tasks per owner (dated)
- Risks & mitigations updates
- GTM: outreach sent, meetings booked, next asks
```

---

## 12) Change Log for Sprint Pack

Path: `CHANGELOG_sprint-2025-09-29.md`

```markdown
## [1.0.0] — 2025-09-29

- Initial capture briefs (5), teaming map, bid/no‑bid template
- Compliance Field Kit stubs (CMMC, FedRAMP, SSDF, Export)
- Product request backlog with $$ impact
- Partner "Better Together" page (Splunk)
- Evidence & daily checklists
```

---

**Next Inputs Requested:**

- Real POCs & vehicles for the 5 briefs; prime preferences; compliance artifacts already on hand (SOC 2, SBOM, etc.).
- Any hard constraints on hosting (GovCloud vs commercial; air‑gap timelines).

```

```
