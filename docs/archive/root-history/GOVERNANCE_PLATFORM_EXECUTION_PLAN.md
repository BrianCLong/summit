# Canonical Governance Platform Execution Plan

This blueprint operationalizes the nine governance/security epics into an integrated, production-ready platform rollout. It defines canonical record handling, retention enforcement, policy-as-code, audit logging, data classification, investigation tooling, secure access, controls evidence, and adoption guardrails.

## 1. Canonical Records Framework

- **Record definitions**
  - **Events**: append-only time series with canonical envelope (`event_id`, `tenant_id`, `actor`, `subject`, `ts`, `schema_version`).
  - **Objects**: versioned domain entities (e.g., case files, entities) with immutable snapshots and diff chains.
  - **Messages**: signed/traceable communications (queue/kafka payloads) carrying provenance and classification tags.
  - **Files**: immutable blobs stored with manifest, content hash (SHA-256), size, MIME, retention class, and source pointer.
- **Immutability rules**
  - Events are append-only; corrections generate compensating events.
  - Objects are versioned: new versions store delta plus full materialized view; lineage links point `source → transform → export`.
  - Files/messages are content-addressed; mutations produce new digests and lineage edges.
- **Metadata schema (all record types)**
  - `record_id` (ULID), `tenant_id`, `owner`, `classification`, `retention_class`, `provenance` (`source`, `transform_chain`, `export_targets`), `created_at`, `hash`, `integrity_status`.
- **Integrity and lineage**
  - Hash verification job hourly for hot storage, daily for archive; failures raise `record.integrity_failed` events.
  - Lineage graph stored in Neo4j with `SOURCE_OF`, `DERIVED_FROM`, `EXPORTED_AS` edges.
- **Search**
  - Audit-optimized index (Postgres JSONB + trigrams) supporting timebox, actor, classification, retention class, hash status, and lineage path queries.
- **Exports**
  - Export bundles are TAR + manifest (record list, hashes, classification, retention) + signed chain-of-custody log; signatures via KMS-backed keys.

## 2. Retention Engine

- **Tiering**: `R1-Operational` (90d), `R2-Standard` (1y), `R3-Regulated` (7y), `R4-LegalHold` (indefinite), `R5-AuditLogs` (per customer SLA).
- **Policies**: tenant-configurable YAML validated by JSON Schema; compiled to OPA bundles (`delete`, `export`, `access`).
- **Legal hold**: entity- and query-scoped freezes with audit trail; conflicts resolved via priority `LegalHold > SLA > User-Requested Delete`.
- **Deletion workflow**: preview blast radius, dependency graph traversal (records + derived datasets), phased purge with throttling and checkpointing.
- **Verified deletion**: double-pass hash listing, storage tombstone verification, attestation stored as record with manifest and hash.
- **Backups/analytics**: retention hooks emit purge plans to backup catalogs; analytics tables tagged with retention class and purge IDs.
- **DSAR propagation**: requests fan out across records + derived datasets; exports reference lineage and redaction policies.

## 3. Policy-as-Code

- **Engine**: centralized OPA/Gatekeeper bundle serving RBAC/ABAC with classification and purpose tags.
- **Versioning**: semantic versions stored in Git + policy registry; every change emits `policy.changed` audit event with diff and reviewer list.
- **Simulation**: `dry-run` endpoint returning decision trace; packaged in admin UI for "what if" previews.
- **Separation of duties**: two-person approval on high-risk actions (mass export, retention override) enforced via policy binding.
- **JIT access**: short-lived capability tokens signed by gateway; enforced expiry and scope with automatic revocation hooks.
- **Why denied**: normalized denial reasons surfaced in API responses and audit logs.
- **CI tests**: conftest + unit suites; blocked merges on unreviewed policy changes.

## 4. Audit Logging Platform

- **Event catalog**: standardized envelope with tenant/user/request/correlation IDs, action, resource, decision, policy version, hash chain pointer.
- **Schema**: protobuf/JSON schema stored centrally; emitted via append-only topic with tamper-evident hash chaining.
- **Storage**: WORM-compatible object store plus Postgres summary index; optional ledger anchoring to external timestamping service.
- **UI**: filters (actor, resource, decision, time, classification), saved views, alerts; rate-limited exports with manifests/hashes.
- **Integrations**: SIEM push via scoped API keys and pagination caps.
- **Detection**: rules for mass export, privilege spikes, anomaly score from baseline models.
- **Retention**: tied to tiers; purge coordinated with retention engine.

## 5. Data Classification & Provenance

- **Schema tagging**: sensitivity (`public`, `internal`, `confidential`, `restricted/PII`, `secret`) + purpose and lawful basis.
- **Redaction/masking**: middleware uses tags to redact logs/exports by default; explicit allowlists required for sensitive fields.
- **Provenance**: every transform emits lineage edges and transformation metadata; catalog exposes freshness, owner, classification.
- **Drift detection**: schema diff watcher raises alerts on new sensitive fields.
- **Access approvals**: workflow with expiry and recertification reports.

## 6. eDiscovery & Investigation Toolkit

- **Workflows**: matter creation, scoped search across records/audit logs/objects, legal hold management, export with chain-of-custody.
- **Exports**: throttled jobs with progress, verification, reproducible pack inputs; redaction tooling per classification.
- **Matter tracking**: custodians, scope, timeline, artifacts, approvals, certifications.
- **Evidence bundles**: templates for regulators/customers with deterministic manifests and hashes.

## 7. Secure Data Access Gateway

- **Pattern**: all sensitive DB access via gateway issuing time-boxed, tenant-scoped tokens; no direct prod paths.
- **Controls**: approvals + expiry for privileged sessions, object-level logging, query allowlists, risky-pattern blocking, exfil detectors.
- **Break-glass**: requires secondary approval, auto-expiry, forced post-review; logs pinned to audit ledger.
- **Customer keys**: envelope encryption with customer-managed keys for enterprise tier.
- **Dashboards**: requests, approvals, anomalies; integrates DSAR/retention enforcement.

## 8. Controls Evidence Factory

- **Control mapping**: SOC2/ISO/HIPAA-style controls mapped to policies and enforcement points; stored in catalog.
- **Evidence capture**: automated pulls for access reviews, configs, policy versions, releases; immutably stored with manifests.
- **Health dashboards**: drift alerts and exception registry with compensating controls + expiry.
- **Internal audits**: quarterly automated runs with findings tickets; one-click evidence pack export.

## 9. Platform Adoption & Anti-Bespoke Guardrails

- **Governance primitives** published as SDKs/mocks/local testing harnesses; templates for regulated industries.
- **Targets**: quarterly adoption goals (domains migrated, legacy paths retired); scorecards track adoption %, exceptions, audit readiness.
- **Change management**: 48-hour SLA for governance changes; exceptions auto-expire with escalation.
- **Legacy removal**: mandate retirement of manual deletes/scripts and bespoke authz paths; CI gate blocks new bespoke checks.

## Architectural Topology (Text)

```
┌─────────────────────────┐    ┌──────────────────┐
│ Secure Access Gateway   │<-->| Policy-as-Code   │
│ (JIT tokens, approvals) │    │ (OPA bundles)    │
└──────────┬──────────────┘    └─────────┬────────┘
           │                             │
           ▼                             ▼
┌─────────────────────┐        ┌─────────────────────┐
│ Canonical Records   │        │ Audit Logging       │
│ + Provenance Ledger │<------>│ (WORM + ledger)     │
└──────────┬──────────┘        └─────────┬──────────┘
           │                             │
           ▼                             ▼
┌─────────────────────┐        ┌─────────────────────┐
│ Retention Engine    │<------>│ eDiscovery Toolkit  │
│ (policy-driven)     │        │ (matters/exports)   │
└──────────┬──────────┘        └─────────┬──────────┘
           │                             │
           ▼                             ▼
         Storage                   Evidence Factory
```

## Delivery Plan (Phased)

- **Phase 0 (Week 0-1):** finalize schemas (records, audit, policy), stand up policy registry + CI tests, bootstrap lineage graph.
- **Phase 1 (Week 2-4):** implement canonical record services with integrity jobs; ship retention engine MVP (tiering, legal hold, purge preview).
- **Phase 2 (Week 5-7):** deploy audit log platform + gateway enforcement; integrate policy-as-code for read/write/export/delete.
- **Phase 3 (Week 8-10):** roll out eDiscovery toolkit, evidence factory automation, and adoption scorecards; migrate two highest-value domains onto records framework and remove bespoke paths.
- **Phase 4 (Week 11+):** expand DSAR propagation, SIEM integrations, break-glass review automation, classification drift detection, and quarterly drills.

## Risks & Mitigations

- **Lineage gaps**: enforce transform instrumentation; CI checks for missing provenance tags.
- **Retention conflicts**: deterministic priority rules and dry-run previews; exception queue with SLA.
- **Policy drift**: gated merges with conftest; automated rollbacks to last known-good bundle.
- **Audit integrity**: hash chaining + external anchoring; periodic verification jobs and WORM-backed storage.
- **Adoption lag**: scorecards, templates, and CI blocks for bespoke authz/deletes.

## Forward-Looking Enhancements

- **Deterministic replay**: event-sourced rebuilds of lineage graphs for provable investigations.
- **zk-SNARK attestations**: optional zero-knowledge proofs for export integrity without revealing payloads.
- **LLM-assisted policy authoring**: guided wizards with formal verification against templates.
- **Federated retention**: policy delegation to customer-controlled nodes with centrally verifiable attestations.
