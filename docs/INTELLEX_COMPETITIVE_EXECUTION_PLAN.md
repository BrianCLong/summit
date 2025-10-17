# Intellex vs. Topicality — Competitive Gap Analysis & Out-Execute Plan (v1.1)

- **Date:** 2025-10-15
- **Owners:** Co-CEOs (You + Me)
- **Contributors:** Product, Engineering, GTM, Governance, DevEx
- **Status:** Ratification draft — circulate for signatures within 48h

---

## 0. Executive Summary

**Thesis:** Intellex (intellex.xyz) is positioning a protocol-and-tools layer for agent interoperability and monetised "memory" (shared knowledge objects with usage metering). Our wedge is a disclosure-first provenance stack (IntelGraph), disciplined execution (Maestro), and governance-by-default (OPA ABAC, SBOM/SLSA, DLP). By proving ROI slices inside two weeks, leading with enterprise governance, and packaging white-label starter modules, we can surpass Intellex on trust, velocity, and economics within 90 days.

**Top Five Moves**

1. **Memory Commons with Attested Lineage** — Ship a Provable Memory Registry (PMR) that disburses royalties **and** publishes per-claim provenance manifests backed by IntelGraph.
2. **Agent Interop Gateway** — Deliver a Maestro-native gateway (OpenAPI + GraphQL + Events) with policy labels (origin, sensitivity, legal_basis) enforced at call time and adapters for LangChain, LlamaIndex, OpenAI Assistants, Slack, Teams, Hume, and GraphAware.
3. **Disclosure Pack by Default** — Every customer artifact exports an SBOM, SLSA provenance statement, claim ledger, and policy conformance sheet.
4. **Design-Partner Blitz** — Close five design partners (Logistics, Support, Nonprofit beachheads + two regulated pilots) with measurable proof-by-dates.
5. **Pricing Wedge** — Meter pricing by **provable decisions delivered** with publishing credits for PMR contributions and transparent usage dashboards.

**North-Star Outcome:** 2,000+ provable decisions recorded by customers in IntelGraph with linked evidence inside 90 days.

**72-Hour Hit List**

| Priority | Outcome | Owner | Deadline | Notes |
| --- | --- | --- | --- | --- |
| P0 | Green-light PMR Alpha & Gateway MVP scope | Co-CEOs + Product | Day 1 | Approve specs + budget; unblock squads |
| P0 | Sign 3 design partners (Logistics, Support, Nonprofit) with proof metrics | GTM Lead | Day 3 | Each partner has ROI baseline + disclosure opt-in |
| P0 | Enable Disclosure Pack default in Maestro | DevEx Lead | Day 3 | Auto-attach SBOM/SLSA + claim ledger |
| P1 | Publish public roadmap + connector bounty brief | Marketing + Platform | Day 3 | Include top 25 connectors and reward structure |
| P1 | Stand up Intellex competitor watchlist | Strategy | Day 2 | Weekly update cadence; RSS + alert routing |

---

## 1. Intellex Positioning Snapshot

- **Product Claims:** Free tools for logistics/support/nonprofit teams; protocol for create → license → use → update → revoke of "memory" objects with usage-metered royalties; agent interoperability hub.
- **Market Narrative:** Infrastructure for memory/agent exchange with tokenised economics and community-led distribution.
- **Observed Gaps:** No enterprise-grade governance detail, light provenance assurances, and unspecified SLAs. Integration catalogue and ROI playbooks are nascent — opening a governance-first wedge for us.

---

## 2. Topicality Current State (Concise)

- **Stacks:**
  - **IntelGraph:** Knowledge graph + claim/provenance ledger with policy labels (origin, sensitivity, legal_basis).
  - **Maestro:** Plan → Run → Artifact orchestration with budgets, attestations, CI/CD hooks, and freeze windows.
  - **Governance:** OPA ABAC, WebAuthn/FIDO2, DLP redactions, SOC2-lite, SBOM/SLSA, data minimisation.
- **Operating Cadence:** Daily Dispatch, Weekly Portfolio & Risk, Monthly Strategy & Metrics, Quarterly Board briefings.
- **North Star:** Count of **provable decisions** customers trust because of provenance.
- **Baseline KPIs:** TTFV ≤ 14 days, Gateway p95 ≤ 300 ms, uptime ≥ 99.9%, gross margin ≥ 70%, ≥ 5 design partners per quarter, payback ≤ 12 months, disclosure pack adoption 100%.

---

## 3. Gap Matrix — Intellex vs. Topicality

| Area | Intellex (Now / Intent) | Topicality (Now) | Our Edge / Gap | Action Plan |
| --- | --- | --- | --- | --- |
| Memory Licensing | Usage-metered royalties; agent-accessible memory objects | Claim-level provenance & policy labels; no public royalty registry | **Gap:** Monetisation UX & shared protocol | Launch **PMR Alpha** with per-claim manifests, royalties, and legal starter pack |
| Agent Interop | Protocol message passing; Slack/Teams + bot focus | Maestro connectors + OPA policies + SLO budgets | **Parity:** Need deeper adapters | Ship **Gateway MVP** with SDKs (LangChain, LlamaIndex, OpenAI Assistants) + event hooks |
| Freemium GTM | Free tooling for 3 verticals | Design-partner motion; enterprise-first | **Gap:** Self-serve activation | Release **Starter Kits** (Logistics, Support, Nonprofit) + hosted sandbox |
| Provenance | Mentions graphs; unclear attestation rigour | **Strength:** IntelGraph + SLSA/SBOM defaults | **Edge:** Compliance-grade provenance | Surface disclosure-first demos; make manifests human-readable |
| Governance & Access | Vision statements; few controls detailed | **Strength:** OPA ABAC, WebAuthn, DLP, policy libraries | **Edge:** Enterprise-ready governance | Publish policy bundles; enable one-click auditor view |
| Economics | Token/micro-royalty narrative | Value tied to asset usage; pricing TBD | **Open field** | Meter by **provable decisions** with PMR publishing credits |
| Community | Early protocol/brand hype | Customer-led references | **Need:** Developer surface area | Publish docs, OSS samples, connector bounty |
| Integrations | Slack/Teams; Jira/Notion/Drive claims | Maestro connectors; regulated workloads TBD | **Gap:** Catalogue depth | Certify 25 connectors in 90 days; keep roadmap public |

---

## 4. Strategy to Surpass — Three Horizons

### Horizon A (Day 0–14): Value Slice

**Objectives:** Deliver measurable ROI in days, launch PMR alpha, and secure three design partners.

**Deliverables:**
- **PMR Alpha:** Postgres + IntelGraph-backed registry with claim manifests, license terms, royalty meter, CLI + JSON schemas.
- **Agent Interop Gateway MVP:** Policy-enforced proxy with Slack, Teams, LangChain, OpenAI Assistants adapters; audit stream → IntelGraph; latency budget ≤ 350 ms p95.
- **Starter Kits:** Logistics, Support, and Nonprofit packages with one-click Maestro runs, sample datasets, dashboards, and ethics memo templates.
- **Disclosure Pack v1:** SBOM (CycloneDX), SLSA provenance, claim ledger, policy conformance auto-attached to every artifact.
- **Design-Partner Contracts:** Lightweight SOWs with success metrics, opt-in to PMR royalties, and proof-by-date inside 14 days.

### Horizon B (Weeks 3–8): Scale & Credibility

- **25 Certified Connectors** across productivity, data, and regulated systems (Jira, Confluence, Notion, Google Drive, Zendesk, Snowflake, BigQuery, Salesforce, ServiceNow, S3, Box, SharePoint, Databricks, Postgres, Kafka, HubSpot, GitHub, GitLab, Linear, Netsuite, Workday, Okta, etc.).
- **Governance Pack:** OPA policy catalogue, auditor view, DLP presets, residency & encryption controls.
- **Interop SDKs:** TypeScript & Python SDKs, recipe library, event-sourced audit streams.
- **Pricing & Billing:** Decision-based invoicing with PMR credit rebates, Maestro usage dashboards, spend alerts.
- **Community Engine:** OSS exemplars, connector bounty board, monthly disclosure showcase livestream.

### Horizon C (Weeks 9–12): Moat & Acceleration

- **Attested Memory Market (Beta):** Search, license, embed workflows with per-claim provenance + legal packs; revenue-share terms.
- **Compliance Verticals:** Finserv + Healthcare overlays (HIPAA/PCI checklists, redaction packs, residency SLAs).
- **Benchmarking:** Publish latency, error rates, and cost per decision; third-party audit attestation.
- **White-Label Modules:** Exportable PMR + Gateway bundles for partners requiring private deployments.

---

## 5. Product Specs — Initial Slices

### 5.1 Provable Memory Registry (PMR) Alpha

- **Data Model:** Entity, Relationship, Claim, Evidence, License, PolicyLabel, UsageEvent.
- **APIs:**
  - `POST /claims`
  - `POST /licenses`
  - `GET /ledger/{claimId}`
  - `POST /usage` (royalty accrual)
  - `GET /manifest/{assetId}`
- **Security:** WebAuthn SSO; OPA ABAC guards per route; per-field policy labels; signed manifests.
- **Artifacts:** Manifest JSON, SBOM (CycloneDX), SLSA provenance, risk memo.
- **Milestones:** Alpha sign-off Day 10; first paying publisher by Day 14.

### 5.2 Agent Interop Gateway MVP

- **Architecture:** REST/GraphQL proxy → policy evaluation → usage emit → upstream call.
- **Adapters:** Slack, Teams, LangChain Runnable, OpenAI Assistants, LlamaIndex Tool, Webhook passthrough, Hume, GraphAware.
- **Observability:** Audit trail to IntelGraph, request/decision counters, cost-per-decision metric, latency/error SLO dashboards.
- **Reliability Targets:** p95 ≤ 300 ms for policy-checked paths, uptime ≥ 99.9%, zero unauthorised access incidents.

### 5.3 Starter Kits

- **Logistics Ops:** Exception triage, ETA forecasting, supplier risk memos; integrates with Snowflake, Netsuite, Slack.
- **Customer Support:** Assist/deflection workflows; integrates with Zendesk, Salesforce, Slack/Teams.
- **Nonprofit Ops:** Grant intel summarisation, outreach sequencing; integrates with Notion, Google Drive, Gmail.
- **Common Elements:** Sample datasets, ROI calculator template, disclosure pack, ethics review checklist, Maestro automation runbooks.

---

## 6. GTM & Pricing Motions

- **ICPs:** Logistics operations, customer support, nonprofit ops, regulated pilots (Finserv, Healthcare).
- **Offer Flow:** Problem brief → tailored demo plan → ROI baseline → design-partner SOW → 2-week value slice → production conversion → disclosure pack showcase.
- **Pricing Guardrails:** Tiered by provable decisions delivered; 10–30% credit rebate for publishing to PMR; clear break-even calculator in Maestro.
- **Proof Motions:** Starter kits include instrumentation to track time-to-first-value (TTFV) ≤ 10 days and 8-week ROI attainment for ≥ 4 partners.

---

## 7. Metrics & SLOs

| Metric | Target | Owner | Instrumentation |
| --- | --- | --- | --- |
| Time-to-First-Value | ≤ 10 days | GTM Ops | Maestro starter kit telemetry |
| Decision Throughput | +20% WoW per design partner | Product Analytics | IntelGraph decision ledger |
| Gateway Reliability | ≥ 99.9% uptime; p95 ≤ 300 ms | Platform | Gateway observability dashboards |
| Disclosure Coverage | 100% artifacts | DevEx | Maestro publishing pipeline |
| Design Partners | ≥ 5 signed; ≥ 4 with ROI ≤ 8 weeks | GTM Lead | CRM + Maestro proofs |
| Supply-Chain Attestations | 100% releases with SBOM + SLSA | Security | Release pipeline check |
| Cost / Decision | Within budget guardrails | Finance Ops | Maestro billing reports |

---

## 8. Risks & Controls

| Risk | Control | Owner |
| --- | --- | --- |
| Ambiguity around "Intellex" brand overlap | Scope explicitly to intellex.xyz protocol; maintain competitor watchlist; engage legal if conflicts emerge | Strategy + Legal |
| Token / royalty compliance concerns | Legal starter pack, revenue-share structured as service credits, regional compliance flags | Legal + Finance |
| Data handling / regulatory drift | Residency controls, DLP presets, auditor view with read-only scopes, quarterly compliance review | Governance |
| Integration fragility | Canary deployments, contract tests per connector, success criteria gating release | Platform |
| Scope creep in PMR & Gateway | Weekly steering review, budget guardrails in Maestro, DoD enforcement | Co-CEOs + Product |

---

## 9. Execution Order — Two-Week Plan

| # | Workstream | Owner | Day 0–14 Milestones | Definition of Done |
| --- | --- | --- | --- | --- |
| 1 | PMR Alpha | Engineering Lead | Day 2 schema freeze; Day 7 API beta; Day 10 alpha review; Day 14 first publisher live | APIs deployed, manifests emitted, royalty accrual working, security review signed |
| 2 | Gateway MVP | Platform Lead | Day 3 adapter stubs; Day 6 policy enforcement; Day 9 latency tuning; Day 12 observability dash; Day 14 demo ready | Slack + LangChain adapters, p95 ≤ 350 ms, audit stream flowing to IntelGraph |
| 3 | Starter Kits | Solutions Lead | Day 4 dataset curation; Day 7 runbooks; Day 10 dry runs; Day 13 partner workshops | Logistics/Support/Nonprofit kits live with ROI calculators and disclosure packs |
| 4 | Disclosure Pack | DevEx Lead | Day 2 pipeline update; Day 5 QA; Day 8 documentation; Day 12 customer comms | SBOM + SLSA + claim ledger auto-attached for all artifacts |
| 5 | Design Partners | GTM Lead | Day 1 target list; Day 5 contract templates; Day 9 handshake approvals; Day 14 proofs scheduled | 3 partners signed, ROI metrics baselined, proof demos booked |

---

## 10. Decision Log Template

- **Context:** Competing with Intellex (xyz) on agent interoperability + monetised memory.
- **Options Considered:** (1) Protocol parity, (2) Governance-first wedge, (3) Vertical point-solutions.
- **Decision:** Execute governance-first wedge with PMR + Gateway and land via three vertical starter kits.
- **Reversible?:** Yes — two-way door inside the quarter.
- **Risks:** Compliance optics, integration churn, scope creep.
- **Owners:** Co-CEOs + Product + Platform + Solutions + GTM.
- **Checks:** Metrics in §7, canary policy reviews, weekly portfolio review.

---

## 11. Appendices

- **A. PMR JSON Schemas:** Claim, License, Manifest.
- **B. OPA Policy Pack:** `origin`, `sensitivity`, `legal_basis` attribute bundles.
- **C. Connector Catalogue & Roadmap:** Top 25 connectors with ETA + owner.
- **D. Disclosure Pack Template:** SBOM, SLSA, claim ledger, policy summary.
- **E. Design-Partner SOW & ROI Model:** Baseline metrics, decision log, co-marketing addendum.

> _Next Step:_ Circulate this plan for signature, execute the 72-hour hit list, and publish externally facing roadmap excerpts + connector bounty brief.
