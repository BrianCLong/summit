# Evidence ID Consistency (Summit)

## Intent

Ensure all generated artifacts remain deterministic, traceable, and backed by
Evidence IDs tied to the Evidence Map and provenance ledger.

## Requirements

1. Every new artifact references a valid Evidence ID in the Evidence Map.
2. Deterministic outputs only: no non-deterministic timestamps, random seeds, or
   environment-specific identifiers in committed artifacts.
3. Provenance links must include the Evidence ID and source file path.
4. Any deviation is treated as a governed exception with explicit authority and
   expiry.

## Agent Actions

- Validate Evidence IDs against the Evidence Map before output.
- Add or update Evidence Map pointers when generating artifacts.
- Record Evidence ID usage in the Action Ledger.

## Output Contract

When recommending or applying changes, include:

- Evidence ID(s)
- Evidence Map file(s)
- Deterministic rationale
