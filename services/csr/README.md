# Consent State Reconciler (CSR)

CSR ingests consent records from CRM, mobile SDKs, and partner activity logs. It merges
conflicting updates into a canonical consent graph with deterministic rule precedence and
transparent proofs explaining each decision.

## Key features

- **Multi-source ingestion** via `/ingest`, supporting batch uploads with per-record proofs.
- **Deterministic reconciliation** using source precedence (`crm` → `app_sdk` → `partner`),
  recency, and lexical tiebreakers.
- **Reconciliation proofs** that capture before/after graph snapshots and the winning rules
  applied to each conflict.
- **Diff and rollback APIs** (`/diff`, `/rollback`) for comparing snapshots and restoring any
  previous consent state exactly.

## Running locally

```bash
npm install
npm run dev
```

### HTTP routes

| Method | Path        | Description |
| ------ | ----------- | ----------- |
| GET    | `/healthz`  | Service health probe |
| POST   | `/ingest`   | Accepts `{ records: ConsentRecord[] }` payloads and returns proofs with the new snapshot id |
| GET    | `/diff`     | Computes differences between snapshots; supports `from`, `to`, and `userId` query params |
| POST   | `/rollback` | Restores a prior snapshot via `{ snapshotId }` |
| GET    | `/snapshots`| Lists all stored snapshots and their proofs |

`ConsentRecord` payloads require `recordId`, `userId`, `consentType`, `status`, `source`, and
ISO-8601 `timestamp`, with optional `channel` and metadata.

## Testing

```bash
npm test
```
