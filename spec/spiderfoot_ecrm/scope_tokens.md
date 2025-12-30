# ECRM Scope Tokens

Scope tokens define the permissible sharing scope, performer identity, and time-to-live.

## Fields

- Signed performer identity and purpose.
- Sharing scope (internal, evaluator, coalition) and TTL.
- Default passive-only egress unless authorization token elevates privileges.

## Validation

- Cached for the TTL to reduce overhead; invalidated on revocation events.
- Recorded in transparency log entries attached to tier manifests.
