# ADR-003: Ingest Staging & Air-Gap Gateway

**Status:** Proposed / Sprint 2 target

## Context

High-velocity ingest must stay reliable and keep dirty payloads away from core databases. Introducing staged object stores with sanitization and buffering provides resilience while preserving provenance for audit and recovery.

## Decisions

- Introduce distinct **Dirty** and **Clean** object stores (e.g., S3/MinIO buckets) with lifecycle policies and immutable audit trails so external data is quarantined until validated.
- Require all external data to pass through a **sanitizer service** that verifies MIME types via magic bytes, strips unsafe markup/control characters, validates JSON with strict schemas, and emits quarantine reports before loader services can access it.
- Buffer high-velocity ingestion through **Kafka/Redpanda topics** to decouple producers from downstream consumers; consumers batch writes, checkpoint only after durable persistence, and expose lag/DLQ metrics.
- Run loader services in a **network-isolated tier** with no egress, access only to Clean storage and databases, and enforce deterministic idempotent upserts keyed by provenance hashes.
- Document the ingest flow, failure modes, and recovery runbooks in `docs/INGESTION.md`, including diagrams for staging, quarantine, and replay.

## Consequences

- Reduces blast radius of malformed or malicious inputs and improves observability of ingest quality.
- Adds operational dependencies (object storage, message bus, sanitizer) that must be managed and monitored, but keeps the Clean bucket free of malformed or malicious files.
- Simplifies ingest scale-out by decoupling producers/consumers while keeping replay deterministic for audits and incident response.
