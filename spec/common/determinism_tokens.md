# Determinism Tokens

## Purpose

Determinism tokens bind replayability and auditability to analytic outputs by capturing seeds, snapshots, and schema versions required to deterministically reproduce computations.

## Structure

- **Snapshot identifier**: Points to the data/time window used.
- **Schema or policy version**: Ensures compatible replay when schemas evolve.
- **Seed value**: Controls randomized components (sampling, sketch initialization).
- **Optional provenance**: Plan hashes, module version sets, or baseline identifiers.

## Practices

- Include determinism tokens in every artifact (campaign signatures, hazard forecasts, proof objects, receipts).
- Validate tokens server-side before replay to prevent cross-version inconsistencies.
- Log tokens into transparency systems to provide a public, immutable anchor.
