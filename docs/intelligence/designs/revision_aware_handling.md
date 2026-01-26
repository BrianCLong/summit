# Revision-Aware Evidence Handling Design

## Purpose

To ensure that edits, deletions, and corrections are captured as additive history rather than destructive updates. This prevents "memory holing" and allows analysis of *evolution*.

## Strategy

### Immutable Ledger Model

1. **Append-Only Storage:**
    - Never `UPDATE` an Evidence record in the primary store.
    - Always `INSERT` a new version with `previous_version_id`.
    - The "Current" state is a pointer to the latest head, but traversal can walk back.

2. **Revision Classification:**
    - Agents must classify the nature of the revision:
        - `correction`: Factual update.
        - `redaction`: Removal of sensitive info.
        - `obfuscation`: Removal of incriminating info (requires intent inference).
        - `formatting`: Styling changes (low signal).

3. **Tombstoning:**
    - Deletions create a `Tombstone` revision containing the deletion timestamp and metadata, linked to the last live version.

## Inputs

- Polling deltas.
- Webhook update events.

## Outputs

- `VersionChain` graph structures.
- `RevisionVelocity` metrics (edits per hour).

## Failure Cases

- **Storage Bloat:** High-frequency, low-value edits (e.g., typos) consuming excessive storage. Requires "Significant Change" filtering or compression.
- **Privacy Compliance:** GDPR "Right to be Forgotten" conflicts. Requires a mechanism to "Hard Delete" specific chains while retaining the *fact* of deletion if legally permissible (or scrubbing content but keeping metadata).
