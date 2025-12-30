# Policy Gateway

## Role

Central entry point enforcing subject, purpose, and policy scopes across MRSGS, CEVH, POAR, JPC, and EAMS services.

## Responsibilities

- Validate authorization tokens and policy scope per request.
- Inject policy versions and scope identifiers into replay tokens.
- Enforce egress and runtime budgets for downstream services.
- Forward attestation requirements to execution runtimes.
