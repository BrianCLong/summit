# Cognitive Security Influence Operations Data Handling Policy

## Never log
* Raw usernames/handles tied to protected characteristics
* Any alleged intelligence handling details beyond public reporting
* Victim identities in synthetic abuse cases
* Unredacted message contents from private chats

## Retention (default)
* Evidence blobs: store hashes + URLs; optional cached snippets; redact by policy.

## Implementation Guardrails
* Schema defines `protectedClass` flag on `IdentitySegment`.
* Logs and exports must pass redaction scrubber before persistence.
* Tested automatically via `__tests__/cogsec/redaction.test.ts`.
