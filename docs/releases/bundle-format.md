# Release Bundle Format

This document describes the structure and validation of the release bundle artifacts.

## Schemas

The release bundle artifacts are validated against JSON Schemas located in `schemas/release/`.

*   `release-status.json`: Validated by `schemas/release/release-status.schema.json`
*   `bundle-index.json`: Validated by `schemas/release/bundle-index.schema.json`
*   `provenance.json`: Validated by `schemas/release/provenance.schema.json`
*   `release-manifest.json`: Validated by `schemas/release/release-manifest.schema.json`

## Validation

You can validate a release bundle directory using the `validate-bundle-schemas.mjs` script.

### Usage

```bash
# Basic validation (lax mode)
node scripts/release/validate-bundle-schemas.mjs --dir dist/release

# Strict validation (fails on missing files)
node scripts/release/validate-bundle-schemas.mjs --dir dist/release --strict
```

### CI Integration

The validation script runs automatically in the release pipeline to ensure all generated artifacts conform to the contract.
