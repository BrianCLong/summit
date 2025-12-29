# API Compatibility Check

To ensure that API changes do not break existing clients, we employ an API compatibility check process.

## Overview

The process consists of two steps:
1.  **Snapshot Generation**: `scripts/snapshot-api.ts` reads the current `docs/api-spec.yaml` and normalizes it into a JSON snapshot.
2.  **Compatibility Check**: `scripts/check-api-compat.ts` compares the generated snapshot against a committed baseline to detect breaking changes.

## Scripts

### `scripts/snapshot-api.ts`

Extracts the OpenAPI specification into a deterministic JSON format.

**Usage:**
```bash
npx tsx scripts/snapshot-api.ts > current-snapshot.json
```

### `scripts/check-api-compat.ts`

Compares a baseline snapshot against the current snapshot.

**Usage:**
```bash
npx tsx scripts/check-api-compat.ts baseline-snapshot.json current-snapshot.json
```

**Breaking Changes Detected:**
-   Removal of API paths.
-   Removal of HTTP methods from existing paths.

Currently, breaking changes trigger a warning.

## Workflow

1.  When making API changes, update `docs/api-spec.yaml`.
2.  Run the compatibility check (via CI or locally).
3.  If breaking changes are intended, you must update the baseline snapshot.

## Updating the Baseline

To update the baseline snapshot (e.g. after a major version bump or authorized breaking change):

```bash
npx tsx scripts/snapshot-api.ts > api-snapshots/baseline.json
```
