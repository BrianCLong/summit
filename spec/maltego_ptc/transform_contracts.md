# Transform Contracts

## Registration

- Each transform declares effect (READ/WRITE/EXPORT), provenance guarantees, disclosure limits.
- Registered in a transform registry with signatures and policy bindings.

## Execution

- Verify authorization for effect under subject context and purpose.
- Enforce disclosure constraints: egress budgets, entity limits, redaction.
- Emit transform artifacts with witness and provenance records plus replay tokens.
