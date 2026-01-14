# Generate Release Artifact Inventory (v1)

## Objective

Generate a deterministic inventory and SHA-256 checksum list for release artifacts to support GA bundle verification.

## Scope

- `scripts/release/generate_artifact_inventory.mjs`
- `scripts/release/build-ga-bundle.sh`
- `docs/roadmap/STATUS.json`

## Requirements

- Accept `--dir <artifact-dir>` and optional `--out <path>`.
- Emit `inventory.json` and `SHA256SUMS` with stable ordering and formatting.
- Record build context (commit SHA + ref).
- Integrate the generator into GA bundle assembly before finalization.

## Constraints

- Maintain deterministic output ordering.
- Avoid non-deterministic timestamps in inventory output.
- Use standard Node.js libraries only.
