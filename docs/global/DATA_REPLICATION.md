# Data Replication & Residency Enforcement

## Replication Strategy

- **Databases**: Home-region primaries with async read replicas in secondary regions gated by residency policy. Writes are single-writer per tenant; cross-region writes require controlled failover fencing tokens. Change data capture (CDC) streams carry monotonic sequence numbers and provenance metadata.
- **Queues/Streams**: Regional message buses with mirrored topics using ordered, idempotent relays. Relay services enforce per-tenant residency lists and drop/alert on unauthorized partition movement.
- **Object Storage**: Region-local buckets with optional cross-region replication policies per bucket/tenant. Sensitive datasets require client-side encryption with regional KMS keys.

## Residency Guarantees

- **Region pinning**: Each tenant has a declared home region stored in the control plane; admission controllers validate on every write and queue publish.
- **Violation denial**: Requests targeting non-home regions return explicit residency errors and emit audit records with tenant, attempted region, and policy version.
- **Audit evidence**: Residency decisions produce signed receipts (decision, evaluator version, inputs). Daily attestations summarize permit/deny counts per region and are retained in immutable storage.

## Conflict Resolution

- **Deterministic rules**: Prefer the update with the highest control-plane commit index; if equal, use lexicographic tie-break on region ID then timestamp. All resolutions logged with causality proofs.
- **Provenance-first**: Apply operations only if provenance headers validate; otherwise quarantine events for manual review with replay tooling.
- **Replay safety**: CDC replays are idempotent and guarded by version vectors; repairs emit reconciliation receipts and alert when divergence exceeds SLO.

## Verification & Controls

- **Pre-commit checks**: Residency validator + policy engine invoked before persistence; failures are fail-closed.
- **Background audits**: Scheduled jobs scan storage/object buckets for residency drift and raise compliance alerts if anomalies are detected.
- **Metrics**: `residency.denied.count`, `replication.lag.ms`, `conflict.resolutions.count`, `replay.quarantine.count` emitted with region and tenant labels.
