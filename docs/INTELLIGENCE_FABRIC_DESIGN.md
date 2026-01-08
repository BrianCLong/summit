# Intelligence Fabric (Summit / IntelGraph)

## High-level goals

- Turn raw events and entities into a navigable knowledge graph plus timeline and map context to expose relationships, causality, and impact across CompanyOS.
- Provide consistent semantics across org, user, asset, system, incident, workflow, policy, dataset nodes with typed edges for causality and ownership.
- Make every node and edge temporally aware (validity intervals, event provenance) to answer "what changed when/why" and to drive blast-radius reasoning.

## Canonical graph schema

### Nodes (core attributes)

- **org**: `org_id`, names/aliases, region, compliance tier, parent_org_id, metadata.
- **user**: `user_id`, `org_id`, emails/handles, roles, auth factors, risk score, status, last_seen, geo history.
- **asset**: `asset_id`, type (device/app/service), owner `user_id/org_id`, lifecycle state, criticality, location, config hash, software SBOM digest.
- **system**: `system_id`, category (infra/app/service), environment, service mesh identity, SLOs, dependencies, deployment version, runtime metadata.
- **incident**: `incident_id`, severity, status, detection source, MITRE tags, timeline pointer, `root_cause` link, responders, comms channel.
- **workflow**: `workflow_id`, definition version, run_id, inputs/outputs, state machine status, owning team, triggered_by (user/automation), SLA.
- **policy**: `policy_id`, control category, version, scope (org/asset/system/user), rule hash, enforcement points, exceptions, attestation state.
- **dataset**: `dataset_id`, domain, schema version, lineage tags, sensitivity level, owner, residency/region, access policies, quality score.

### Edges (directional, with temporal validity)

- **caused**: expresses causal link (source ➜ effect) with `confidence`, `evidence_refs`, `event_id`, validity window.
- **depends_on**: upstream dependency (consumer ➜ provider) with `context` (runtime/build/time-bound), `criticality`, `latency_budget`.
- **owns**: ownership/entitlement (owner ➜ resource) with `role`, `granted_by`, `source_policy`, `lease_expiry`.
- **violated**: policy or SLA violation (actor/resource ➜ policy/constraint) with `evidence`, `severity`, `detected_at`, `resolved_at`.
- **derived_from**: lineage/provenance (child ➜ parent) with `transformation`, `batch/window`, `checksum`, `replayable` flag.
- **notified**: alerting/communications (notifier ➜ recipient) with `channel`, `payload_hash`, `delivery_state`, `ack_at`.

### Versioning, time, provenance

- All nodes/edges are **bitemporal**: `valid_from/valid_to` for real-world effect; `recorded_at` for ingestion time.
- Mutations are **append-only** (event-sourced): new versions emitted with monotonic `version`, `change_set` diff, `prev_ref` pointer.
- Every change carries **provenance**: `event_id`, `source_system`, `ingest_pipeline`, `auth_context`, `signature` (when supplied).
- **Soft-deletes** modeled by closing `valid_to`; hard-deletes only for privacy/erasure with tombstone event linking to request.
- Spatial context stored via `geo_point` + `geo_shape` attachments for map rendering; stored as properties on nodes/edges where relevant.

## Ingest & normalization pipeline

### Flow

1. **Collect**: connectors ingest raw events (webhooks, logs, db CDC, message buses, file drops).
2. **Classify**: schema detector tags event type (security alert, policy eval, workflow run, dataset job, asset inventory, auth) and sensitivity.
3. **Normalize**: map fields to canonical envelopes: `event_id`, `source`, `occurred_at`, `observed_at`, `actor`, `subject`, `resources`, `geo`, `raw_payload_ref`.
4. **Enrich**: identity resolution (email/UPN/device IDs ➜ `user_id/asset_id`), org scoping, geo/IP reputation, policy context, SBOM matching.
5. **Validate**: schema validation (JSON Schema per event class), timestamp sanity (clock drift ±5m), deduplication by `(source,event_id,fingerprint)`.
6. **Authorize**: per-tenant isolation; reject/mark quarantined if source not trusted or signature missing/invalid.
7. **Translate to graph ops**: deterministic mappers emit **Graph Update Records (GURs)**: `upsert_node`, `append_edge`, `close_edge`, `add_timeline_event`, `index_geo`.
8. **Persist**: write to event log (Kafka/NATS) + projection into graph store (e.g., Neo4j/JanusGraph) and timeline store (OLAP/time-series).
9. **Feedback**: on failure, route to DLQ with reason, raw payload pointer, replay token; metrics/traces emitted for ingest latency and error class.

### Normalization rules

- **IDs**: namespace per tenant: `tenant:<type>:<provider>:<id>`; stable UUIDv5 canonical IDs; maintain aliases for joins.
- **Timestamps**: store `occurred_at` (event time), `ingested_at` (pipeline time), `valid_from/valid_to` (graph validity); enforce ISO-8601 UTC.
- **Schemas**: versioned JSON Schemas; backward-compatible evolution via `oneOf` for deprecated fields; strict additionalProperties=false post-validation.
- **Geo/Spatial**: normalize to WGS84 lat/lon; map to regions; attach uncertainty radius when inferred.
- **Untrusted/partial data**: mark with `confidence`, `trust_tier`; quarantine or shadow-store raw payload; never allow to overwrite trusted facts—only additive with lower precedence.

## Query patterns & APIs

### Common queries

- **What changed before X?**: bitemporal diff on node/edge versions prior to timestamp X; include provenance and responsible actor.
- **Who is impacted by Y?**: graph traversal from node Y following `depends_on/owns/derived_from` to depth N with filters (criticality, org scope).
- **Blast radius**: starting from incident/alert, compute affected assets/users/systems/policies; include geo clusters and timeline slices.
- **Why did this alert fire?**: reconstruct causal chain following `caused` edges + supporting `violated` nodes/policies and timeline events.

### API surface

- **Write**: `POST /graph/updates` accepts batch of GURs; idempotent via `update_id`; supports dry-run validation.
- **Read**:
  - `GET /graph/nodes/{id}` / `GET /graph/edges/{id}` with `at=timestamp` for temporal view.
  - `POST /graph/query` accepts graph query DSL (subset of openCypher/Gremlin) with filters, projections, pagination cursors.
  - `POST /graph/traverse` for constrained traversals (depth/edge-type/time filters) optimized for blast-radius/impact flows.
  - `GET /timeline` with filters (`entity_id`, `incident_id`, `policy_id`, window) returning ordered events with provenance and deltas.
  - `GET /map` for geo slices aggregated by tile/cluster.
- **Pagination**: cursor-based (opaque `next_cursor`); support `limit`, `timeout`, `consistency` hints (strong/eventual).
- **AuthN/Z**: per-tenant isolation, role and ABAC checks; signed requests; row-level filters auto-applied to graph queries.

### Performance, storage & caching

- **Hot paths**: maintain **materialized views** for blast radius (precomputed dependency expansions) and **temporal snapshots** at coarse intervals (e.g., hourly) with delta replay.
- **Indexes**: on `(type,id)`, `(valid_from,valid_to)`, edge type, criticality, geo hashes; vector index for semantic similarity (descriptions).
- **Caching**: CDN/edge for read-mostly summaries; server-side cache for small traversals; memoize diff queries by `(id,at)`; invalidate on new versions.
- **Sharding**: per-tenant or per-org partitioning; consistent hashing for high-cardinality nodes (users/assets); cross-shard traversal via supernodes + federation layer.
- **Observability**: traces tagged by `event_id/update_id`; metrics for ingest lag, traversal latency, cache hit rate, DLQ volume; audits for every change.

## Artifacts

### Schema outline (condensed)

- Node base: `id`, `type`, `tenant`, `version`, `valid_from`, `valid_to`, `recorded_at`, `provenance`, `attributes`, `geo`, `tags`, `labels`.
- Edge base: `id`, `type`, `src`, `dst`, `direction`, `version`, `valid_from`, `valid_to`, `recorded_at`, `confidence`, `provenance`, `attributes`.
- Timeline event: `event_id`, `entity_refs`, `occurred_at`, `ingested_at`, `change_set`, `diff`, `provenance`, `geo`, `attachments`.

### Example queries (pseudo)

- **Temporal diff**: `MATCH (n {id: $assetId})-[v:VERSION]->(ver) WHERE ver.valid_from <= $t < ver.valid_to RETURN ver ORDER BY ver.valid_from DESC LIMIT 2`.
- **Blast radius**: `POST /graph/traverse` payload:
  ```json
  {
    "start": "incident:123",
    "edge_types": ["depends_on", "owns", "derived_from"],
    "depth": 3,
    "filters": { "criticality": ["high", "critical"], "tenant": "acme" },
    "as_of": "2026-05-10T12:00:00Z",
    "return": ["node.id", "node.type", "node.attributes", "path"]
  }
  ```
- **Why alert fired**: graph DSL example `PATHS FROM alert:abc VIA caused->*1..5 TO incident:* WHERE edge.confidence > 0.6 INCLUDE provenance`.

### Graph Ingestion Contract (per source)

- **Metadata**: provider name, tenant scope, contact, environment, signing keys, retention expectations.
- **Delivery**: transport (HTTP webhook/Kafka/S3/etc), retry/backoff semantics, batch sizing, compression, ordering guarantees.
- **Schema**: JSON Schema URL/version; required fields (`event_id`, `occurred_at`, `source`, `actor`, `subjects/resources`, `raw_payload_ref`), optional enrichment fields.
- **Identity**: mapping of source identifiers to canonical IDs; alias tables; confidence levels.
- **Security**: signature scheme (HMAC/JWS), mTLS/allow-list, PII markers; redaction expectations; trust tier classification.
- **Quality**: SLAs for delivery lag/error rate; test fixtures; contract tests; replay guidance; sample payloads.
- **Governance**: data residency, retention, deletion hooks; incident escalation contacts; change management for schema versions.

## Forward-leaning enhancements

- **Causal inference assist**: run lightweight causal discovery on event streams to propose `caused` edges with confidence, reviewed via human-in-the-loop UI.
- **Adaptive precomputation**: use workload-aware scheduler that promotes frequently traversed subgraphs into in-memory snapshots with TTL based on query heat.
- **Signed lineage**: integrate C2PA-style cryptographic receipts on `derived_from` edges for high-assurance lineage across datasets and model artifacts.
