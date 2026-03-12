# OSINT/IntelGraph Blueprint (Summit)

## 1. Purpose and scope
This blueprint codifies a production path for Summit’s OSINT surface on IntelGraph: a multi-tenant intelligence graph with strong provenance, compartmentation, and analyst-first workflows. It is intentionally pragmatic: define the smallest secure “golden path” and feature-flag everything else.

**What this covers**
- Data model (entities, edges, claims, provenance, audit)
- Governance (ABAC/RBAC, licensing, retention, oversight)
- Feature-flag plan (rollout gates, kill switches, staged enablement)

**Out of scope (tracked as follow-ups)**
- New connectors beyond the initial OSINT connector set
- Full “magic copilot”; only controlled NL→Graph queries with preview and audit

---

## 2. Data model
### 2.1 Core graph types
- **Case**: a scoped workspace; owns data visibility, SLAs, and disclosure state.
- **Entity**: typed node (Person, Org, Asset, Account, Domain/IP, Location, Event, Document, Communication, Device, Indicator, Narrative, Campaign, License, Authority).
- **Relationship**: typed edge (ownership, control, communication, co-location, co-occurrence, derived-from, contradicts/supports).
- **Evidence (RawSource)**: immutable ingest artifact with hash, storage pointer, license, and connector lineage.
- **Claim**: a normalized assertion derived from evidence; claims are the only acceptable “source of truth” references attached to nodes/edges.
- **Transform**: the processing chain (parser → normalizer → classifier → resolver) with parameters, version, and hash of output.
- **AuditEvent**: append-only log of “who/what/when/why/policy decision” across read/write/export.

### 2.2 Provenance chain (mandatory hop)
1. Connector ingests **Evidence**
2. ETL produces **Claim(s)** from evidence
3. Graph write is permitted only with **Claim ID references**
4. Exports produce a signed **Manifest** (hash set + chain-of-custody)

**Required fields (minimum viable)**
- `tenantId`, `caseId`
- `createdAt` and `observedAt`
- `licenseRef`
- `confidence`, `sourceReliability`, `informationQuality`
- `hash`, `transformChain` (Transform IDs)

### 2.3 Temporal & geo-temporal
All entities/relationships support bitemporal attributes:
- `validFrom` / `validTo` (entity state timeline)
- `observedAt` / `recordedAt` (OSINT evidence timeline)

Provide API/query helpers like `snapshotAsOf(time, caseId, policyContext)` to support analyst timelines and “what did we know when?” questions.

### 2.4 Schema governance
- Canonical ontology lives in a schema registry (even if it starts as versioned JSON + migrations)
- Schema changes require approval + generated types/tests
- Ad-hoc types are forbidden; services must register new types with the registry

---

## 3. Governance
### 3.1 Anchors
- **Provenance over prediction**: every fact and query must be traceable
- **Compartmentation by default**: case + policy labels drive access
- **Analyst-first**: UX optimizes review, dissent annexes, and disclosure bundles
- **Oversight as a feature**: audits, warrants/authority binding, right-to-reply, dual-control deletes

### 3.2 Policy engine
Implement ABAC via policy labels and a central policy evaluator:
- Resource labels: sensitivity, legal basis, purpose, retention, origin, jurisdiction
- Evaluate on every data access and export
- Provide policy simulation/testing mode

### 3.3 Reason-for-access (RFA)
- High-risk routes require explicit RFA
- RFA stored in AuditEvent; policies can deny/allow with rationale

### 3.4 Licensing & data rights
- Maintain a **License Registry**; every evidence/claim attaches `licenseRef`
- Enforce licensing at export: block bundles that violate terms with human-readable reason and an override path (dual control)

### 3.5 Retention & deletion
- Retention labels applied at ingest
- Deletion is dual-control for sensitive data, and must maintain audit proofs
- Export manifests and audit trails are treated as protected records

### 3.6 Misuse detection
Basic guardrails (MVP, expand later):
- Query cost limiting and sampling alerts
- Over-broad query detection and anomaly access patterns
- Honeypot tagging for data-poisoning sanity checks

---

## 4. Feature-flag plan
### 4.1 Goals
- Safely iterate OSINT/IntelGraph capabilities without widening blast radius
- Ensure governance controls ship first
- Enable gradual rollout by environment + tenant + case

### 4.2 Flag primitives
- **Capability flags**: enable a feature module
- **Safety flags**: require preview/confirmation or enforce “ledger-only” semantics
- **Rollout flags**: enable for specific tenant/case/environment
- **Kill switches**: immediate off for dangerous connectors/routes

### 4.3 Proposed flags (MVP)
- `intelgraph.provenance_required` (default **true**) — blocks graph writes without Claim IDs
- `intelgraph.export_manifest` (default **true** for prod) — require signed manifests for exports
- `intelgraph.nl_query_preview` (default **true** in dev/stage, **true** in prod with confirmation) — NL→GraphQL/Cypher gated by preview + explicit user confirm
- `intelgraph.case_spaces` (default **true**) — enforce case scoping everywhere
- `intelgraph.disclosure_packager` (default **false** prod until retention/licensing checks pass)
- `intelgraph.contradiction_graphs` (default **false** initially) — surfaces contradiction relationships in UI
- `osint.connector_maltego` / `osint.connector_i2` / `osint.connector_stix_taxii` (default **off** per connector) — enable connectors individually

### 4.4 Rollout phases
**Phase 0 (now)**
- Provenance-required, case scoping, RFA and audit logging flags enabled
- NL query preview shipped but locked behind preview + confirmation

**Phase 1**
- Enable a single “golden path” OSINT runbook end-to-end (2–3 connectors)
- Disclosure packager enabled only after license enforcement + manifest checks verified

**Phase 2**
- Turn on contradiction graphs + additional connectors one by one
- Broaden federated query surfaces only when policy & audit coverage are proven

---

## 5. Review artifacts & acceptance
**This doc is the contract**: it defines minimum governance and rollout criteria for OSINT IntelGraph. Any implementation change (schema, connector output, query layer) must state:
- Which flags gate it
- Which policies enforce it
- How provenance/audit is preserved

**Next deliverables**
- Update docs/intelgraph/overview.md to link to this blueprint
- Add a feature flag registry file + enforcement checks in gateway
- Draft PR template section for “Governance + Flags reviewed”
