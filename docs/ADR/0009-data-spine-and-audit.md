# 0009: CompanyOS Data Spine & Audit Strategy

- **Status:** Accepted
- **Date:** 2025-01-10
- **Deciders:** Platform Architecture, Security, Data Engineering
- **Tech Level:** Foundational platform

## Context
- Sprint theme requires durable capture of authz decisions, policy/config changes, and core data mutations.
- Existing services already share policy fetcher and multi-tenant authz, but events are not standardized or routed to a governed spine.
- Auditors and customer security teams need traceable evidence for "who accessed what under which policy" plus lineage from policy bundles to reports.

## Decision
- Adopt a **repo-backed schema registry** under `schemas/data-spine/events` with semantic versioning and examples.
- Standardize on a **canonical envelope** (event_id, event_type, occurred_at/recorded_at, tenant_id, subject_id, source_service, trace/correlation ids, region, data).
- Define v1 payload schemas for `authz.decision`, `policy.bundle_updated`, `config.changed`, and a CDC exemplar `company.profile_changed`.
- Require **at-least-once delivery** via a durable log/bus and mandate DLQs for producer failures.
- Materialize a **queryable audit table** fed from `authz.decision.*` topics with indexes on tenant_id + timestamp.
- Track **lineage** by persisting policy bundle hashes and job run metadata for audit materializations.

## Consequences
- Producers and consumers must pin to explicit event versions; breaking changes create new `v{n}` topics/schemas and dual-write until cutover.
- Schema review + CI validation become part of the change workflow; adding a new event type without schema/examples will fail CI.
- Downstream sinks can reconstruct entity history from CDC events and join to authz decisions for comprehensive audit views.
- DLP rules can be centrally enforced using the classification maps and hashed fields defined in schemas.

## Alternatives Considered
- **Ad-hoc per-service events:** rejected; no consistency for lineage/audit.
- **DB-only audit tables:** rejected; misses non-DB decisions and increases coupling to transactional schema.
- **Schema-less log ingestion:** rejected; high risk of drift and difficult governance.

## Rollout Plan
1. Land schemas + examples in repo and wire CI validation.
2. Instrument authz gateway + two target services to emit `authz.decision.v1` and CDC events.
3. Stand up ingestion topic layout + raw sink; enable DLQs.
4. Build audit materialization job and publish canned SQL for security teams.
5. Capture lineage metadata for the policy → decision → audit → report flow.

## Retention & Privacy
- Raw events retained 90 days by default; audit tables retained 180 days with tenant-configurable overrides.
- Sensitive fields must be hashed or omitted; `SENSITIVE_PII` classification is banned from authz/config events.
- Access to audit tables is restricted to security roles with row-level filters on tenant_id.
