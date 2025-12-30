# Integration Package

This directory now contains both the legacy SRE integration notes and the patent-style integration contract for the five wedges. The contract defines endpoints, services, tools, guardrails, and UI specs aligned with IntelGraph and MC orchestration.

## IntelGraph Endpoints (minimal contract)

- `POST /v1/evidence/verify`
- `POST /v1/witness/append`
- `GET  /v1/witness/session/{id}`
- `POST /v1/policy/check`

## Layout

- `intelgraph/`: API contract and service notes for evidence, policy, and witness ledger plus connectors.
- `mc/`: Tool surfaces and guardrails (verify-first, budget enforcer).
- `summit/`: UI specs for evidence, witness, replay, and wedge-specific views.

Golden rule: never pass unverified evidence to the LLM (`mc/guardrails/verify_first.md`).
