# Records & Legal Hold Model v0

## Purpose and scope

This model defines what constitutes a record in CompanyOS, how records are classified and retained, and how legal holds and eDiscovery are executed across tenants, services, and storage backends. It is designed to align with privacy, residency, and deletion requirements while preserving auditability and defensibility.

## Records taxonomy

- **Audit events**: security/compliance events, admin actions, user access logs, data lineage events.
- **Configurations**: system/tenant configuration snapshots, policy files, workflow versions, feature toggles.
- **Incidents**: security incidents, reliability incidents, postmortems/RCAs, remediation tasks.
- **Communications**: user notifications, admin messages, ticketing transcripts, system announcements tied to incidents or changes.
- **Exports and data shares**: data exports, report downloads, API bulk responses, downstream syncs.
- **Policy and governance decisions**: approvals/waivers, risk assessments, DPIAs, retention overrides, residency location decisions.
- **Derived evidence**: proofs from integrity services (hashes, signatures), provenance ledger entries, chain-of-custody receipts.

## Retention classes and defaults

- **Operational telemetry (short-tail)**: routine audit and access logs; retain **90 days** unless extended by tenant plan or regulatory mapping.
- **Security and compliance core**: incident records, privileged admin changes, provenance ledger; retain **7 years** or longer per regulated workloads.
- **Product/tenant configuration**: configs, policy versions, workflow history; retain **3 years** after last modification or tenant termination, whichever is later.
- **End-user content and communications**: notifications, support transcripts, user-generated policy acknowledgements; retain **1 year** unless tenant specifies longer for regulated roles.
- **Exports and shared datasets**: retain export manifests and checksums **2 years**; purge export payloads per data sensitivity class (default **30 days**).
- **Governance and risk assessments**: DPIAs, approvals/waivers, retention overrides; retain **7 years**.
- **Employee/custodian actions (internal use)**: admin console actions, access escalations; retain **7 years**.

### Privacy, residency, and deletion alignment

- **Data minimization**: store only purpose-specific fields; redact/ tokenize PII where not needed for evidentiary value.
- **Residency tagging**: every record carries jurisdiction and residency tags (e.g., `EU`, `US`, `CA`); storage backends enforce location-aware buckets and replication policies.
- **Deletion and right-to-be-forgotten**: implement logical deletion markers and crypto-shredding keys so non-held records can be purged while preserving immutable provenance pointers.
- **Tenant-configurable schedules**: allow tenant overrides within guardrails (cannot shorten below contractual/ regulatory minimums).
- **Verification**: scheduled jobs reconcile deletion requests against residency and retention schedules; mismatches raise compliance alerts.

## Legal hold mechanics

- **Creation**: counsel/compliance submits hold with matter ID, description, jurisdiction, start/end scope, custodians, and covered data classes; requires approval from legal + data protection officer for cross-border scopes.
- **Scoping**: holds target tenants, custodians, entity types (audits, configs, incidents, comms, exports, governance artifacts), time ranges, and sensitivity classes. Optional keywords and system tags refine scope.
- **Effect**: suspension of deletion/TTL for in-scope records; retention clocks pause, deletion jobs skip held items, and export payloads are preserved with escrow copies.
- **Propagation**: hold metadata pushes to storage services (object store, DBs, queues) via event bus; services return acknowledgements for chain-of-hold evidence.
- **Tracking**: central hold registry stores status, scope, approvals, acknowledgements, reconciliation results, and review cadence. All changes are audit-logged with actor, reason, and timestamp.
- **Review and release**: periodic reviews (e.g., quarterly) require counsel sign-off; release triggers resumption of retention timers with a configurable grace period and notifies custodians of lift.
- **Conflict handling**: overlapping holds deduplicate scopes; longest duration wins for retention. Holds supersede tenant deletion requests until explicitly released.

## eDiscovery tooling plan

- **Search experience**: faceted search by tenant, matter ID/hold, time window, entity type (audit, config, incident, comms, exports, governance), sensitivity tag, and custodian. Keyword search with stemming across communications and incident narratives.
- **Preview and culling**: sampled previews, relevance filters, and volume estimates prior to export; tag items for exclusion with justification.
- **Export flows**: export packages include metadata JSON, normalized data (CSV/JSONL), associated artifacts (attachments, configs, export payloads), and cryptographic hashes. Exports produce a manifest and chain-of-custody receipt.
- **Custodian scoping**: map custodians to identities (IdP, email, Slack, admin accounts). Cross-reference admin actions and communications to custodians for targeted holds/exports.
- **Auditability**: every query, preview, export, and access is logged with actor, purpose, matter ID, and results count. Immutable proofs recorded in provenance ledger.
- **Residency-aware handling**: exports respect residency tags; cross-border exports require explicit approval and apply anonymization/redaction where required.
- **Access control**: role-based (counsel, compliance, auditor) with least privilege; dual control for high-sensitivity exports.

## Records & Legal Hold Model v0 outline

1. Purpose, scope, and principles (privacy-by-design, defensibility, minimization).
2. Records taxonomy with mappings to data sources and storage locations.
3. Retention classes, default durations, and tenant override policy.
4. Residency and privacy alignment (tags, segregation, deletion model).
5. Legal hold lifecycle: create, approve, propagate, monitor, review, release.
6. eDiscovery workflow: search, cull, export, validation, and custody evidence.
7. Governance: roles, approvals, periodic reviews, and reporting.
8. Operational runbooks: reconciliation jobs, alerting, and exceptions handling.

## Example legal hold scenario (step-by-step)

1. Security incident opens (Matter `SEC-2026-0412`); counsel creates hold scoped to Tenant A, custodians (SRE lead, Security lead), entity types `incidents`, `audits`, `communications`, time window last 120 days.
2. Hold request includes justification and cross-border flag (EU data); DPO approves, triggering hold activation.
3. Hold registry emits `hold.created` event; storage services (object store, DB, messaging) acknowledge pausing TTL and deletion for scoped objects; crypto-shredding keys for affected exports are escrowed.
4. Admin deletion requests and user RTBF jobs detect hold and skip in-scope records; provenance ledger logs the deferral with matter ID.
5. eDiscovery user searches by matter ID and custodian, reviews communication snippets, tags out-of-scope items, and exports a curated set. Export manifest stores hashes and custody chain referencing `SEC-2026-0412`.
6. Quarterly review confirms hold still valid; counsel renews. After investigation ends, counsel issues release; retention timers resume after a 30-day grace period and deferred deletions execute.

## Checklist: "Data domain is records-ready if…"

- Records taxonomy mapped to all datasets with residency tags and sensitivity classes.
- Retention schedule configured with default + tenant-specific overrides, and jobs reconciling deletions vs. holds.
- Legal hold propagation wired to every storage backend with acknowledgements and monitoring dashboards.
- eDiscovery search facets aligned to entity types, tenants, custodians, and time; exports emit manifests and custody receipts with hashes.
- Admin/RTBF flows respect holds and residency; crypto-shredding enabled for reversible deletion of non-held data.
- Access controls and audit logs cover search, preview, export, hold changes, and deletion deferrals.
- Periodic reviews (quarterly/annual) recorded with approvals and escalations for exceptions.
