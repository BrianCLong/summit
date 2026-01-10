# Verify-First Guardrail

## Purpose

Require policy validation before any regulated export or incident reporting action.

## Enforcement

- Call policy gateway with scope token and egress budgets.
- Block execution on `deny` reasons.
- Log decision ID with the output artifact.
