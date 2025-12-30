# Source Query Minimization (JPC)

## Techniques

- Filter pushdown and projection pruning per source capability.
- Endpoint-aware batching to reduce overhead and comply with rate limits.
- Deduplication of equivalent queries via signatures; cache invalidation on source version change.
- Egress budget enforcement with redaction prior to join reconstruction.

## Certificates

- Join preservation certificates include plan hashes, query sets, witness chains over intermediates, replay tokens, and optional attestation quotes.
