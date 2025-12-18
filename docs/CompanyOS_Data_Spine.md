# CompanyOS Data Spine & Audit Layer (Sprint Theme: Data Spine & Lineage)

## Scope & Goals
- Capture all critical decisions (authz, policy, config) and data mutations as structured, versioned events.
- Land events in a governed spine with CDC, lineage-ready metadata, and queryable audit trails.
- Provide forward-compatible schemas, governance, and operational SLOs/runbooks.

## Architecture Overview
- **Producers:**
  - Shared authz gateway & service clients emit `authz.decision.v1`.
  - Policy service emits `policy.bundle_updated.v1` for publish/rollback.
  - Config/feature flag service emits `config.changed.v1`.
  - Domain services (e.g., company profiles) emit CDC as `<domain>.entity_changed.v1`.
- **Transport:** Durable log (Kafka/NATS JetStream/SQS+S3) with at-least-once delivery. Topics are namespaced by event type (e.g., `cos.authz.decision.v1`).
- **Raw Sink:** Immutable bucket/table storing event envelope + payload for replay and lineage.
- **Curated/Audit:** Materialized audit tables (e.g., `audit.authz_decisions`) for fast queries and dashboards.
- **Schema Registry:** Repo-backed registry in [`schemas/data-spine/events`](../schemas/data-spine/events) with semantic versions; CI validates examples against schemas.
- **Lineage Metadata:** Stored as JSON/YAML in `warehouse/lineage` (future) tying policy bundle → decision → audit view → report.

### Event Flow (authz example)
1. Request hits authz gateway → decision computed using policy bundle + flags.
2. Gateway emits `authz.decision.v1` (envelope + payload) to `cos.authz.decision.v1` topic with trace_id/correlation_id.
3. Ingestion service writes to raw store (S3/Delta/Iceberg) and to audit materialization job.
4. Audit job upserts into `audit.authz_decisions` (partitioned by tenant_id, date) and records lineage edges (policy bundle hash → audit table snapshot → downstream report id).

## Schemas & Compatibility
- Canonical schemas live in [`schemas/data-spine/events`](../schemas/data-spine/events) with examples and evolution rules.
- Backward-compatible changes are additive; breaking changes require new major version and dual-write window.
- `classification` maps in CDC events enable DLP enforcement and redaction.

## Audit Trail MVP
- **Audit table shape:** `timestamp`, `tenant_id`, `subject_id`, `resource_type`, `resource_id`, `action`, `decision`, `policy_id`, `policy_version`, `location`, `flag_state`, `source_service`, `trace_id`, `correlation_id`.
- **Materialization:**
  - Consumer subscribes to `authz.decision.*` and CDC topics.
  - Writes to columnar store (DuckDB/Parquet/ClickHouse) with hourly partitions; indexes on `tenant_id`, `timestamp`.
- **Pre-baked queries:**
  - Denies in last 24h for a tenant:
    ```sql
    SELECT * FROM audit.authz_decisions
    WHERE tenant_id = $1 AND decision = 'deny' AND timestamp > now() - INTERVAL '24 hours';
    ```
  - Access to resource type by user in last 30d:
    ```sql
    SELECT * FROM audit.authz_decisions
    WHERE subject_id = $1 AND data_resource_type = $2 AND timestamp > now() - INTERVAL '30 days';
    ```
  - Actions governed by a policy id in last 7d:
    ```sql
    SELECT * FROM audit.authz_decisions
    WHERE policy_id = $1 AND timestamp > now() - INTERVAL '7 days';
    ```

## CDC Path (company profiles)
- **Source:** `public.company_profiles` table.
- **Mechanism:** DB logical replication or application CDC hook emitting `company.profile_changed.v1` with `cdc_lsn` offsets.
- **Redaction:** `contact_email` hashed; classification map guides downstream drop rules.
- **History reconstruction:** order by `cdc_lsn` / `occurred_at` to rebuild entity timeline.

## Data Classification & DLP Guardrails v0
- Supported tags: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SENSITIVE_PII`.
- Emit hashes instead of raw PII (e.g., `client_ip_hash`, `contact_email_hash`).
- CI should block schemas that introduce `SENSITIVE_PII` into non-CDC audit events.

## SLOs (initial)
- **Ingestion success:** 99.5% of events delivered to raw sink within 1 minute.
- **Audit freshness:** 95% of audit tables updated within 5 minutes of source event time.
- **CDC completeness:** <0.1% lagged events older than 10 minutes.

## Dashboards & Alerts
- Metrics: `events_produced_total`, `events_ingested_total`, `ingest_failures_total`, `audit_materialization_lag_seconds`, `cdc_lag_seconds`.
- Alerts:
  - Critical: ingestion failure rate >1% for 5m; audit lag >15m; CDC consumer stopped.
  - Warning: schema validation failure in CI; lineage write failures.

## Runbooks (high level)
- **Ingestion failures:** pause producers if necessary, inspect DLQ, replay from offsets, validate schema drift.
- **Audit staleness:** check consumer health, inspect lag metrics, backfill affected partitions from raw sink.
- **Schema change:** add schema + examples, run validation, coordinate dual-write rollout, update consumers, and deprecate old topic after burn-in.

## Lineage Example
- Policy bundle `policy-bundle-2025-01` (checksum `sha256:...`) → `authz.decision.v1` events referencing `policy_bundle_hash` → audit materialization job `audit-decisions-v1` (job run id) → dashboard `access-denials-by-tenant`.
- Each job run records upstream schema `$id`, topic offsets, target table snapshot, and code version for traceability.

## Future Enhancements
- Add schema registry automation (lint + publish) in CI.
- Expand CDC coverage beyond company profiles.
- Add UI endpoint exposing audit queries and lineage graph JSON.
