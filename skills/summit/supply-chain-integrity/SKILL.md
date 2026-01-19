# Supply Chain Integrity (Summit)

## Intent

Enforce pinned dependencies, provenance capture, and trusted execution paths for
all skill ingestion and automation.

## Requirements

1. Dependency sources must be allowlisted and pinned by SHA.
2. Every skill ingestion emits provenance records with file digests.
3. Deploy-capable skills require explicit opt-in and action ledger logging.
4. Any unpinned or unverified source is blocked or marked as a governed
   exception.

## Agent Actions

- Validate registry entries before installation.
- Require SBOM and provenance hooks for new automation.
- Separate trusted and untrusted workflows by capability gates.

## Output Contract

When recommending or applying changes, include:

- Pinned source + SHA
- Provenance artifact location
- Capability gates invoked
