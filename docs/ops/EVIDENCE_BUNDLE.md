# Evidence Bundle Manifest

This guide explains how to generate a minimal evidence bundle manifest for provenance receipts and their lineage. The manifest is deterministic for the same inputs and does **not** contact external services.

## What the manifest contains

- The manifest schema version (`evidence-bundle/0.1`).
- The deterministic generation timestamp (latest `createdAt` within the filtered receipts).
- The input selector that was used (receipt ID or time range).
- Receipt records with:
  - Receipt identifiers and associated record IDs.
  - Provenance ledger entry IDs and references.
  - Redaction indicators and the redacted field list.
- The set of schema versions observed in the receipts (e.g., `Receipt v0.1`, `PolicyDecision v0.1`).

## What the manifest does **not** contain

- Raw payloads from receipts or provenance entries.
- Secrets, tokens, or connection details.
- External lookups or network calls.
- Attachments or binary artifacts—only references and identifiers are emitted.

## Generating a manifest

The script reads the deterministic fixture at `scripts/evidence-bundle/sample-ledger.json` and filters receipts by ID or time window.

```bash
# By receipt ID
npx tsx scripts/export-evidence-bundle.ts --receipt receipt-001

# By time range (inclusive)
npx tsx scripts/export-evidence-bundle.ts --from 2024-11-01T00:00:00Z --to 2024-12-31T23:59:59Z
```

### Inputs

- `--receipt <id>`: Export a single receipt.
- `--from <iso> --to <iso>`: Export all receipts created between the bounds (inclusive).

If no selector is provided, the script prints a helpful usage message and exits with an error.

### Output

The manifest is printed to `stdout` as prettified JSON. The `generatedAt` value is derived from the newest `createdAt` timestamp in the filtered receipts to keep output deterministic for the same inputs.

### Validation & determinism

A Jest unit test (`scripts/__tests__/export-evidence-bundle.test.ts`) validates the manifest shape against a JSON schema and snapshots the output to ensure deterministic ordering.
