# IntelGraph — Companion Backlog (Wishbook → Epics → Stories → Acceptance)

> Scope: exhaustive mapping of Council Wishbook Sections A–I to deliverable epics, user stories, and concrete acceptance criteria. Also flags competitor‑matrix coverage (table‑stakes, mid‑tier, differentiators).

## Competitor Matrix Alignment

**Table‑stakes (ship first):** Data Integration, Data Analysis, Threat Intelligence, Threat Detection, Data Visualization, Business Intelligence, Competitive Analysis, AI/ML Capabilities, Predictive Analytics, Compliance, AI/ML Workflows, Cybersecurity, Incident Response, Risk Management, Data Enrichment.

**Mid‑tier parity (phase‑in):** Vulnerability Assessment, Compliance Reporting, SIEM Integration, Vulnerability Management, OSINT Gathering, Real‑Time Monitoring, Incident Response (workflow), Endpoint Security, Entity Resolution, Customer Insights, Attack Surface Management.

**Differentiators to exceed market:** GenAI/GraphRAG, Agentic AI, Data Federation, Sentiment Analysis, Custom Crawling Profiles, Performance Optimization (1000× targeted queries), Unified Threat Detection (TDIR), Full‑Stack Observability, Index‑Free Adjacency, Cypher Query Language.

---

## A. Data Intake & Preparation

### Epic: A01 — **Connectors catalog** (HTTP, S3, GCS, Azure Blob, Kafka/Kinesis/AMQP, STIX/TAXII, MISP, CSV/Parquet, email/RSS, IPFIX, DNS/WHOIS, Shodan‑like datasets, public sanctions lists).

**Matrix coverage:** Data Integration, OSINT Gathering, Threat Intelligence

- **Story:** Use case: bulk OSINT pull
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Use case: ingest CTI feeds
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Use case: import agency case exports
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Use case: pull doc sets for discovery
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: A02 — **Ingest wizard** with schema mapping, PII classification, DPIA checklist, and redaction presets.

**Matrix coverage:** Data Integration, Compliance

- **Story:** Use case: paralegal loads discovery
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Use case: analyst maps CSV to canonical entities in minutes
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: A03 — **Streaming ETL** with enrichers (GeoIP, language, NER, hash, perceptual hash for images, EXIF scrub, OCR).

**Matrix coverage:** Real‑Time Monitoring, Data Integration

- **Story:** Use case: live tipline → case inbox
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Use case: SOC alerts → graph nodes with geo/time marks
  - _Acceptance:_
    - [ ] Given an analyst with appropriate role, When they execute the workflow end‑to‑end, Then the outcome is achieved with audit events recorded
    - [ ] Provenance includes source and transformation chain for all artifacts
    - [ ] p95 task completion time under target benchmark
- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: A04 — **Data license registry** + TOS enforcement

**Matrix coverage:** Compliance

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## B. Canonical Model & Graph Core

### Epic: B01 — **Entity/Relationship model** (Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, IP/Domain, Transaction, Case, Campaign, ThreatActor, Malware, Vulnerability, Incident, Sample, FinancialInstrument, Infrastructure, Claim, Indicator, Case).

**Matrix coverage:** Data Analysis

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: B02 — **Entity Resolution (ER)**: deterministic + probabilistic; explainable scorecards; manual reconcile queues.

**Matrix coverage:** Entity Resolution

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: B03 — **Temporal versioning**: validFrom/validTo, bitemporal truth; snapshot‑at‑time queries.

**Matrix coverage:** Data Analysis, Predictive Analytics

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: B04 — **Geo‑temporal graph**: trajectories, stay‑points, convoy detection, rendezvous detection.

**Matrix coverage:** Data Visualization, Predictive Analytics

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: B05 — **Provenance/lineage**: every node/edge carries `source → assertion → transformation` chain.

**Matrix coverage:** Compliance

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: B06 — **Policy tags**: origin, sensitivity, clearance, legal basis, need‑to‑know facets.

**Matrix coverage:** Compliance

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## C. Analytics & Tradecraft

### Epic: C01 — **Pathfinding & centrality**: shortest/cheapest, K‑paths; betweenness/eigenvector.

**Matrix coverage:** Data Analysis

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: C02 — **Pattern miner**: co‑travel, co‑presence basics.

**Matrix coverage:** Predictive Analytics

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: C03 — **Feature store + detectors** with triage queues.

**Matrix coverage:** Threat Detection, Risk Management

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## D. AI Copilot (Auditable by Design)

### Epic: D01 — **NL→Cypher/SQL with preview + sandbox**; guardrails explain denials and policy impacts.

**Matrix coverage:** AI/ML Capabilities, AI/ML Workflows, GenAI/GraphRAG

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: D02 — **RAG over case corpus** with inline citations/provenance; schema‑aware ETL assistant.

**Matrix coverage:** GenAI/GraphRAG, Data Integration

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## E. Collaboration & Workflow

### Epic: E01 — **Narrative builder** from graph snapshots; hypothesis generator.

**Matrix coverage:** Business Intelligence, Competitive Analysis

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: E02 — **Triage & casework**: queues, assignments, comments, pins/annotations.

**Matrix coverage:** Incident Response, Business Intelligence

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## F. Security, Governance & Audit

### Epic: F01 — **ABAC/RBAC + OIDC** with step‑up auth (WebAuthn/FIDO2).

**Matrix coverage:** Compliance, Cybersecurity

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: F02 — **Audit**: who/what/when/why; reason‑for‑access prompts; queries < 3s p95 on 6‑month window.

**Matrix coverage:** Compliance, Risk Management

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: F03 — **Policy reasoner & simulation**: human‑readable denials; dry‑run changes vs historical access.

**Matrix coverage:** Compliance

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## G. Integrations & Interop

### Epic: G01 — **STIX/TAXII & MISP** (bi‑directional).

**Matrix coverage:** Threat Intelligence, OSINT Gathering, SIEM Integration

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: G02 — **SIEM/XDR** (Splunk, Elastic, Chronicle, Sentinel); Jira/ServiceNow; Slack/Teams.

**Matrix coverage:** SIEM Integration, Incident Response, Business Intelligence

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## H. Ops, Observability & Reliability

### Epic: H01 — **DR/BCP + PITR & cross‑region replicas**; offline mode with CRDT merges; cost guard + slow‑query killer.

**Matrix coverage:** Full‑Stack Observability

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: H02 — **Observability**: OpenTelemetry, SLO error budgets, query heatmaps; budget enforcer.

**Matrix coverage:** Full‑Stack Observability

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## I. Frontend Experience

### Epic: I01 — **Link‑analysis canvas**: pivot/expand; tri‑pane timeline+map+graph with brushes; pins/annotations.

**Matrix coverage:** Data Visualization, Business Intelligence

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

### Epic: I02 — **Explainability panels** for algorithms and policy denials; “Explain this view.”

**Matrix coverage:** Business Intelligence, Compliance

- **Story:** Design & API/Schema finalized
  - _Acceptance:_
    - [ ] OpenAPI/GraphQL schema reviewed and approved
    - [ ] Data model documented and examples provided
    - [ ] Threat model completed; abuse cases documented
- **Story:** Implement & Instrument
  - _Acceptance:_
    - [ ] Happy‑path functional tests passing
    - [ ] p95 latency SLO met on benchmark dataset
    - [ ] OTEL spans/metrics emitted; dashboard created
- **Story:** Governance, Audit & Docs
  - _Acceptance:_
    - [ ] RBAC/ABAC policies enforced with human‑readable denials where applicable
    - [ ] Audit events emitted for create/update/delete and access
    - [ ] Docs include runbooks and acceptance test steps

---

## Universal Acceptance Patterns

- **Given/When/Then** format used; each story must include at least 3 verifiable checks.
- **Performance:** p95 user interaction < 250ms on canvas operations; p95 query < 2s on 100k‑edge subgraph.
- **Security:** all endpoints behind OIDC; least privilege by default; policy denials explain _why_ and _how to request access_.
- **Provenance:** exports include manifest with hashes for all artifacts and transforms.
- **ER Explainability:** merges show similarity features and human overrides; full audit replay possible.
