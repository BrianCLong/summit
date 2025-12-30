# Schema Delta Computation

## Steps
1. Receive prior and updated ontology schemas.
2. Diff schemas to detect type changes, field additions/removals/renames, and action signature updates.
3. Normalize deltas into machine-readable form (JSON schema fragments) with hashes.
4. Compute delta hash for cache keying and artifact reuse.
