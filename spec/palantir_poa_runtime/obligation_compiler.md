# POAR Obligation Compiler

## Responsibilities

- Parse action specifications into an execution plan IR.
- Attach policy, disclosure, invariant, and execution obligations.
- Emit a proof obligation bundle tied to policy version and determinism token.

## Validation

- Reject plans with forbidden EXPORT operations unless authorized.
- Ensure disclosure obligations are representable as policy-as-code rules.
