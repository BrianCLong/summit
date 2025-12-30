# Guardrail: Disclosure Budget Enforcer

Prevents over-sharing by applying disclosure constraints to CLI outputs and API calls.

## Policies

- Enforce egress byte budgets and entity count limits on tool responses.
- Redact sensitive fields by default unless explicit approval is provided.
- Track cumulative disclosure per session and halt when budget exhausted.
