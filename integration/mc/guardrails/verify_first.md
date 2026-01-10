# Guardrail: verify_first

Ensures all evaluator runs verify determinism tokens, policy profiles, and rights
assertions before execution.

## Enforcement

- Rejects runs missing determinism token fields.
- Rejects runs without policy-as-code validation.
- Logs failures to transparency log.
