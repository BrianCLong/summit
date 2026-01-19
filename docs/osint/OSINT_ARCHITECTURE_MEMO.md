# OSINT Data Products Architecture Memo

## Executive Summary
Summit already includes the core building blocks for OSINT data products: a graph-first analytics stack, canonical domain schemas, connector conformance rules, evidence scoring, and policy-as-code governance. This memo consolidates those patterns into a recommended ingestion-to-analysis architecture that preserves provenance, enforces evidence quality, and keeps governance auditable from source to insight.

## Repository-Aligned Architectural Patterns
- **Graph + relational split:** Summit centers on Neo4j for entity/relationship analytics and Postgres for metadata, cases, and audit trails, which supports both OSINT link analysis and operational workflows.
- **Policy-as-code governance:** OPA-backed policy checks and immutable ledger patterns are the default for governance and auditability.
- **Connector conformance and evidence scoring:** Connectors are expected to be idempotent, rate-limit aware, redaction-safe, and to emit evidence metadata that can be scored for completeness.
- **Lineage-first ingestion:** Consent metadata and terms of use are captured as lineage attributes at ingestion time.
- **Canonical domain model:** OSINT entities and relationships must map to the IntelGraph canonical schemas to preserve interoperability.

## OSINT Canonical Data Model Alignment
Use the IntelGraph canonical schemas to normalize OSINT artifacts before writing to shared stores.

| OSINT Artifact | Canonical Entity/Relationship | Notes |
| --- | --- | --- |
| Person of interest | `Person` | Normalize identifiers; attach external references and metadata. |
| Organization or group | `Organization` | Capture legal name, aliases, and external references. |
| Event timeline entry | `Event` + `occurredAt` | Use `validDuring` for time ranges. |
| Document/source | `Evidence` | Store `uri`, `hash`, and `artifactType` for auditability. |
| Claim/assertion | `Claim` + `supports/contradicts` | Link claims to evidence IDs and subjects. |
| Relationship linkage | `associatedWith`, `derivedFrom`, `locatedIn` | Maintain source/target IDs and evidence references. |

## Integration Points for OSINT Data Products
1. **Connector layer**
   - Implement connectors that satisfy conformance rules for idempotency, retries, pagination, rate limits, error mapping, and redaction.
   - Emit evidence metadata suitable for scoring and auditing.
2. **Evidence scoring**
   - Score connector outputs for required fields, redaction markers, and source attribution before downstream enrichment.
3. **Lineage and consent metadata**
   - Stamp consent status, scopes, and terms URL into ingestion lineage for every record.
4. **Policy-as-code enforcement**
   - Run policy checks at ingest and access time to ensure governance consistency and trace decisions into audit records.
5. **Storage and analytics**
   - Persist normalized entities/relationships in Neo4j; store case metadata, audit records, and retention controls in Postgres.

## Recommended OSINT Architecture (Summit-Aligned)
1. **Ingest**: Connector fetches OSINT data and emits records plus provenance/consent metadata.
2. **Normalize**: Map records into the canonical domain model, enforce schema versioning, and deduplicate identifiers.
3. **Score Evidence**: Apply evidence rules and attach scoring results to `Evidence` entities.
4. **Govern**: Enforce policy-as-code decisions; log to immutable ledger. Legacy feeds are registered as **Governed Exceptions** with explicit policy tags and lineage.
5. **Persist**: Write entities/relationships to Neo4j, and case/audit metadata to Postgres.
6. **Analyze**: Provide graph analytics, relationship expansion, and claims evaluation for OSINT products.
7. **Observe**: Track ingestion health, policy denies, and evidence quality metrics via existing observability patterns.

## Comparison Table of OSINT Ingestion Approaches

| Approach | Strengths | Risks | Best Fit |
| --- | --- | --- | --- |
| Connector-first (API/SDK) | Highest governance fidelity, native conformance checks, rich lineage | Upfront connector build cost | High-value sources, long-lived integrations |
| Batch ETL (CSV/JSON) | Fast onboarding, low engineering cost | Weaker real-time visibility, higher dedupe burden | Historical backfills, one-time data loads |
| Stream ingestion (webhooks/queues) | Near real-time updates, strong automation | Requires robust rate-limit & retry discipline | Time-sensitive monitoring feeds |
| Federated query + caching | Reduced duplication, dynamic enrichment | Dependency on upstream availability | Partner-owned data and shared intelligence |

## Public References
1. OASIS STIX 2.1 Specification: https://oasis-open.github.io/cti-documentation/stix/intro
2. OASIS TAXII 2.1 Specification: https://oasis-open.github.io/cti-documentation/taxii/intro
3. W3C PROV-O Provenance Ontology: https://www.w3.org/TR/prov-o/
4. MITRE ATT&CK Knowledge Base: https://attack.mitre.org/
5. OpenTelemetry Specification: https://opentelemetry.io/docs/specs/

## Readiness Alignment
This architecture asserts readiness against the Summit Readiness Assertion and treats any deviations as managed, policy-governed exceptions.
