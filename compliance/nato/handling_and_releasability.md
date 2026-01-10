# NATO Handling & Releasability

## Scope Token Alignment

- Scope tokens encode classification, tenant, purpose, and TTL.
- Tokens must validate against `intelgraph.policy.contracting` before export.

## Marking Metadata

- Packs include NATO handling metadata and release scope labels.
- Redaction deltas are preserved for audit and replay.

## Evidence Requirements

- Pack manifest with hash commitments
- Transparency log digest for each releasability pack
- Policy decision logs for scope enforcement
