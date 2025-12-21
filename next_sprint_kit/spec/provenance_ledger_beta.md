# Provenance Ledger Beta Specification

## Goals
Capture event-level provenance with tamper-evident hash chaining and exportable verification bundles for R2/R3 demos.

## Data Model
- `eventId` (UUID), `timestamp`, `actorId`, `tenantId`, `action`, `resource`, `payload`, `hashPrev`, `hashCurr`, `signature`.
- Hashing: `hashCurr = SHA256(eventId + timestamp + payload + hashPrev)`; `hashPrev` for first event is `GENESIS`.
- Storage: Postgres table `prov_events` (append-only), partitioned by day.

## Write Path
1. Services emit `ProvenanceEvent` via gRPC/HTTP to ledger ingest API `/prov/v1/events`.
2. Ingest validates schema, signs payload using signer-service, computes hash chain, and stores event.
3. On failure, retry up to 3 times with exponential backoff; poison queue persisted for investigation.

## Read Path
- Query API supports filtering by `actorId`, `resource`, `time range`, `action`, and `traceId`.
- Export API: `POST /prov/v1/export` with filters; returns signed JSONL plus `manifest.json` (counts, checksum, signer cert, verification script hash).

## Integrity & Verification
- Nightly verification job recomputes hash chain and posts results to `prov.verification` dashboard and R2/R3 KPIs.
- Exports include `verify.sh` snippet: recompute checksums, validate signature, and ensure monotonic timestamps.

## Observability & KPIs
- Metrics: `prov_events_ingested_total`, `prov_export_bundle_duration_ms`, `hash_chain_errors_total`.
- Targets: ≥95% ingest success, exports <60s for 10k events, zero verification failures in demos.
- Logs include `bundleId`, `traceId`, `signer` for every export.

## Security & Policy
- RBAC enforced via OIDC; tenants cannot read cross-tenant events.
- PII minimization: payloads redact sensitive fields; hashing occurs post-redaction.
- Audit: guardrail rejects `DELETE`/`UPDATE` operations; only append is allowed.
