# Compatibility Shims

## Responsibilities

- Rewrite old client requests to updated schema.
- Preserve type correctness for fields used by prior action signatures.
- Emit deterministic diffs for shadow execution.

## Validation

- Rewrite rule termination.
- Policy invariant checks via policy engine.
- Evidence receipts logged to transparency log.
