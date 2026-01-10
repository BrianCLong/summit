# Verify First Guardrail

## Rule

Never pass unverified evidence to any LLM or automated reasoning engine.

## Enforcement

- Require `POST /v1/evidence/verify` before tool invocation.
- Reject tool requests without `verified=true` response.
- Record guardrail decision in witness chain.
