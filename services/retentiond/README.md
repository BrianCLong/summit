# retentiond

`retentiond` is a Go daemon that compiles declarative retention policies into storage-layer TTL enforcement for S3 and Postgres. Each sweep produces verifiable Merkle-tree receipts and powers an HTTP metrics feed that the accompanying dashboard consumes.

## Features

- Policy-driven TTLs across S3 prefixes and Postgres tables
- Dry-run execution and dedicated backfill scanner (`retentiond backfill`)
- Cryptographic deletion receipts stored on disk and verified with `retentionctl verify`
- HTTP metrics server exposing run history and KPI summaries

## Getting Started

```bash
go build ./cmd/retentiond
./retentiond serve --config ./config.sample.yaml
```

Enable dry-run mode with `--dry-run` to inspect the target sets before deleting data. Use `retentiond backfill --config ...` to print the dry-run summary without mutating storage.

Receipts are written to the configured `receipts.directory`. Verify them offline via:

```bash
go run ./cmd/retentionctl verify receipts/<receipt-file>.json
```
