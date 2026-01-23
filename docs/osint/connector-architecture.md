# OSINT Connector Architecture & Operations

## Purpose

Summit’s connector ecosystem provides deterministic ingestion with strict provenance envelopes.
Connectors produce normalized, replayable outputs from fixtures or live sources while isolating
non-deterministic metadata.

## Connector Contract

Each connector emits:

- **Deterministic payload**
  - `records[]` with normalized fields
  - `provenance` with `source`, `query`, `auth_mode`, `licensing_tags`, `raw_payload_hash`
- **Non-deterministic metadata**
  - `retrieval_time` (isolated, stored outside deterministic artifacts)

This ensures replay bundles are byte-stable while preserving the compliance record of when and
how data was fetched.

## Connector Types

1. **Social / Monitoring (Fixture-backed)**
   - Simulates real-time ingestion with replayable fixtures.
   - Captures repost/retweet relationships using `repost_of`.
2. **Enrichment (Fixture-backed)**
   - Adds domain/IP/email context with deterministic outputs.
   - Records lookup category and evidence URLs.

## Operations Runbook (Deterministic Mode)

1. Stage fixtures under `test/fixtures/osint-replay/`.
2. Run connectors to generate normalized records.
3. Build replay events and a case replay bundle.
4. Use `summit-replay-filter` to filter JSONL by time window, platform, entity, or language.
5. Store any runtime timestamps in an isolated metadata file (not in JSONL output).

## Compliance Notes

- Raw payload hashes are mandatory for audit chain verification.
- Licensing tags must be enforced before any data is merged into investigations.
- Connector runs must log policy decisions to the provenance ledger.

## Browser-First Collaboration

The connector architecture is designed for browser rendering, but the deterministic JSONL replay
bundle is the authoritative artifact. This supports synchronous review in the web UI and
asynchronous audit replay in offline environments.
