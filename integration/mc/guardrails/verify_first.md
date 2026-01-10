# Verify-First Guardrail

## Purpose

Ensures verification of capsule commitments before tool output is trusted.

## Workflow

1. Validate replay token and commitment signature.
2. Check witness chain integrity for referenced artifacts.
3. Only return results after verification succeeds.

## Failure Modes

- Verification failure returns a policy-denied error.
- All failures are logged for audit review.
