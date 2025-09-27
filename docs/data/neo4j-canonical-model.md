# Canonical Neo4j Data Model & Ingest Policies

## Overview
This document defines the canonical Neo4j graph schema, ingest expectations, and governance controls for the Day-0 connectors (S3/CSV and HTTP). The model supports fraud/threat intelligence detection workloads that require ≤300 ms p95 latency for 1-hop traversals and ≥50 MB/s/worker sustained ingest throughput while satisfying purpose limitation and retention requirements.

## Entity-Relationship Summary
| Label | Description | Key Properties | Purpose Tags |
| --- | --- | --- | --- |
| `Tenant` | Logical customer/line-of-business boundary. | `tenant_id` (UUID), `name`, `region`, `tier` | `CoreOps` |
| `Dataset` | Source collection for ingested records. | `dataset_id`, `source_type` (`S3`, `HTTP`), `uri`, `ingest_job_id`, `checksum`, `retention_tier` | `IngestOps` |
| `Record` | Raw ingestion unit (row or HTTP payload). | `record_id`, `record_hash`, `ingested_at`, `schema_version`, `purpose_tags` | `IngestOps`, `FraudIntel` |
| `Entity` | Real-world actor (person, org, asset). | `entity_id`, `entity_type`, `display_name`, `identifiers` (map) | `FraudIntel`, `ThreatHunt` |
| `Signal` | Derived analytic insight (score, anomaly). | `signal_id`, `signal_type`, `score`, `observed_at`, `expires_at`, `explainability_ref` | `FraudIntel`, `ThreatHunt` |
| `Event` | Timestamped action or alert correlated across records. | `event_id`, `event_type`, `severity`, `status`, `first_seen`, `last_seen` | `FraudIntel`, `ThreatHunt`, `Compliance` |
| `Location` | Geo/infra context (geo, IP, cloud asset). | `location_id`, `location_type`, `coordinates`, `asn`, `country_code` | `ThreatHunt`, `Compliance` |
| `Indicator` | Atomic IOC (hash, email, domain). | `indicator_id`, `indicator_type`, `value`, `confidence`, `valid_from`, `valid_until` | `ThreatHunt` |
| `Provenance` | Lineage + transformation metadata for audit. | `prov_id`, `collected_at`, `collector`, `transform_chain`, `lineage_uri` | `Governance` |

## Relationship Summary
| Relationship | Direction | Description | Cardinality | Indexed Properties |
| --- | --- | --- | --- | --- |
| `(:Tenant)-[:OWNS]->(:Dataset)` | Tenant → Dataset | Dataset ownership. | 1:N | `Dataset.dataset_id` |
| `(:Dataset)-[:HAS_RECORD]->(:Record)` | Dataset → Record | Raw record linkage. | 1:N | `Record.record_hash` |
| `(:Record)-[:DESCRIBES]->(:Entity)` | Record → Entity | Entity attributes from record. | M:N | `Entity.entity_id` |
| `(:Record)-[:OBSERVED_AT]->(:Location)` | Record → Location | Source or observation location. | M:1 | `Location.location_id` |
| `(:Record)-[:DERIVES]->(:Signal)` | Record → Signal | Derived signals computed from record. | 1:M | `Signal.signal_id` |
| `(:Signal)-[:TRIGGERS]->(:Event)` | Signal → Event | Event created by signal threshold. | M:1 | `Event.event_id` |
| `(:Event)-[:INVOLVES]->(:Entity)` | Event → Entity | Entities implicated in event. | M:N | `Event.event_id`, `Entity.entity_id` |
| `(:Entity)-[:LOCATED_IN]->(:Location)` | Entity → Location | Canonical entity location. | 1:M | `Entity.entity_id` |
| `(:Indicator)-[:MATCHES]->(:Entity)` | Indicator → Entity | IOC correlated to entity. | M:N | `Indicator.value` |
| `(:Record)-[:HAS_PROVENANCE]->(:Provenance)` | Record → Provenance | Source lineage metadata. | 1:1 | `Provenance.prov_id` |
| `(:Signal)-[:HAS_PROVENANCE]->(:Provenance)` | Signal → Provenance | Transformation lineage. | 1:1 | `Provenance.prov_id` |

## Property Details & Indexing Strategy
- All node labels include `tenant_id` for multi-tenant isolation and composite indexes pair `tenant_id` with each primary identifier to guarantee targeted lookups.
- `record_hash` (SHA-256) enforces deduplication at ingest. `record_id` is source-supplied; dedupe uses `MERGE` on `(Record {tenant_id, record_hash})`.
- `identifiers` on `Entity` is a map storing `type:value` pairs (e.g., `{"ssn": "..."}`) with hashed/salted sensitive values.
- Temporal properties (`ingested_at`, `observed_at`, `first_seen`, `last_seen`, `valid_from`, `valid_until`, `expires_at`) are `datetime` values for retention enforcement via Cypher policies.
- Purpose tags stored as `purpose_tags` arrays on nodes/relationships to support row-level filtering and audit export.

To satisfy p95 ≤300 ms for 1-hop traversals, the schema defines native indexes on each `*_id` + `tenant_id` combination and relationship degree caps enforced by ingest validation (≤5k relationships per Record and ≤100 Events per Signal) to avoid high-degree hotspots.

## Constraints & Indexes (see `schema/neo4j/canonical_graph.cypher`)
- Node key constraints on each label’s `(tenant_id, *_id)` pair.
- Additional unique constraint on `Record.record_hash` per tenant to prevent duplicates.
- Range indexes on datetime fields used for retention sweeps (`expires_at`, `last_seen`).
- Fulltext index on `Entity.identifiers` and `Indicator.value` for investigative search.

## Retention, Purpose, and Residency Policies
Retention policies are codified in `specs/retention/neo4j_label_policies.yaml` and summarize as follows:
- **Hot Tier (30 days):** `Record`, `Signal`, `Event` for active investigations. Residency pinned to source region unless cross-region legal hold is triggered.
- **Warm Tier (180 days):** `Entity`, `Indicator`, `Location` to support longitudinal analytics. Lineage maintained via `HAS_PROVENANCE` relationships.
- **Archive Tier (365 days + delete):** `Dataset`, `Provenance` objects retained for compliance evidence, stored in region-of-origin with export controls.
Purpose limitation uses the `purpose_tags` array. Allowed tags per label include `CoreOps`, `IngestOps`, `FraudIntel`, `ThreatHunt`, and `Compliance`. Ingest jobs must populate tags from connector configuration; enforcement occurs via policy service before writes.

## Data Residency & Lineage Annotations
- `Tenant.region` drives default residency. Cross-region replication requires approval recorded in `Provenance.transform_chain` with `residency_override=true`.
- All ingestion steps append to `Provenance.transform_chain` (array of `{step, actor, timestamp, checksum}`) to satisfy lineage requirements.
- `Dataset.retention_tier` informs automated purge jobs; the retention job reads the YAML policy and issues Cypher deletions scoped by tenant and label.

## Performance Considerations
- Batch ingest merges up to 5k nodes/edges per transaction using `UNWIND` with periodic commit to maintain ≥50 MB/s/worker throughput.
- High-read queries leverage precomputed relationship projections (e.g., `MATCH (s:Signal {tenant_id: $tenant, signal_id: $signal})-[:TRIGGERS]->(e:Event)`), benefiting from targeted indexes and 1-hop traversals.
- Relationship creation order ensures idempotency (`MERGE` before `SET`) and surfaces `ingest_job_id` for visibility in metrics and lineage.

## Testing Expectations
Smoke tests (`k6` + Cypher) should:
1. Validate constraint creation and index usage (`CALL db.schema.visualization()` to verify indexes online).
2. Execute golden dataset traversals (Record→Signal→Event) verifying ≤300 ms p95.
3. Run retention job dry-run mode to confirm policies are executable without violating constraints.

Refer to accompanying Cypher schema (`schema/neo4j/canonical_graph.cypher`), ingest mappings (`specs/ingest/canonical_ingest_mappings.yaml`), and sample fixtures (`samples/graph/*`) for implementation-ready assets.
