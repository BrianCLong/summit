# Verify-First Guardrail

## Objective

Prevent downstream automation before artifacts are verified for policy,
commitment integrity, and attestation.

## Required Checks

1. Validate `policy_decision_id` with policy gateway.
2. Verify commitment root against evidence bundle.
3. Confirm replay token determinism (or cache validation).
4. Validate attestation quote when available.

## Failure Handling

- Block automation and require human review on any failed check.
