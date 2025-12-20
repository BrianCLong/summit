# Verifying a disclosure bundle externally

Use the provenance verifier CLI when you need to confirm that an exported evidence bundle (directory or `.zip`) contains intact artifacts, Merkle metadata, and transform chains.

## Install and build

```bash
pnpm install --filter @intelgraph/prov-ledger-verifier
pnpm --filter @intelgraph/prov-ledger-verifier build
```

## Run the CLI

```bash
# Human-readable output
pnpm --filter @intelgraph/prov-ledger-verifier exec prov-ledger-verify --bundle /path/to/bundle

# JSON report for automation
pnpm --filter @intelgraph/prov-ledger-verifier exec prov-ledger-verify --bundle /path/to/bundle --json
```

The CLI exits with non-zero status on any integrity failure (missing evidence, hash mismatch, incomplete transform chain, or invalid claims). Bundles must include a `manifest.json` at the root.

## Built-in fixtures

The package ships with ready-to-run fixtures under `packages/prov-ledger-verifier/fixtures`:

- `valid-bundle/` and `valid-bundle.zip` – end-to-end passing bundle.
- `missing-evidence/` – manifest references a file that is not present (expected failure).
- `hash-mismatch/` – file contents have been tampered relative to the manifest hash (expected failure).

## CI guardrail

The workflow `.github/workflows/prov-ledger-verifier.yml` installs the package, runs the Jest suite (unit hash logic + fixture integration), builds the CLI, and executes it against the fixtures. The job fails if the negative fixtures ever verify successfully.
