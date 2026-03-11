# Evidence Artifact Index

This directory contains the machine-readable manifest of all accepted evidence artifacts, along with scripts to discover and archive them.

## Files

- `EVIDENCE_INDEX.yaml`: The machine-readable manifest of all known evidence artifact types, including required fields, validation commands, and retention policies.
- `CURRENT_ARTIFACTS.json`: A generated listing of all currently discovered evidence artifacts, produced by `scripts/archive/build-evidence-index.sh`.

## Scripts

### `scripts/archive/build-evidence-index.sh`

This script scans the repository for all evidence artifacts matching the patterns defined in `EVIDENCE_INDEX.yaml`.
It writes its output to `evidence-index/CURRENT_ARTIFACTS.json`.
The script will exit with a non-zero status code if required artifacts are missing in standard structures.

Usage:
```bash
./scripts/archive/build-evidence-index.sh
```

### `scripts/archive/archive-evidence.sh`

Copies evidence artifacts to a dated archive directory under `evidence-archive/YYYY-MM-DD/` and generates a manifest file with SHA-256 checksums of all archived files.

Usage:
```bash
./scripts/archive/archive-evidence.sh
```

These scripts are designed to be idempotent and safe to run on every merge, maintaining determinism.
