# Integration Package

This directory contains the integration contract and supporting notes for the five wedges.
It aligns IntelGraph services, MC guardrails, and Summit UI surfaces with shared evidence,
witness, and policy primitives.

## IntelGraph API (minimal contract)

- `POST /v1/evidence/verify`
- `POST /v1/witness/append`
- `GET  /v1/witness/session/{id}`
- `POST /v1/policy/check`

## Structure

- `intelgraph/`: OpenAPI contract and service notes for evidence, policy, and witness ledger;
  connector expectations for social ingest, intel feeds, and OSINT modules.
- `mc/`: Tool surfaces and guardrails (verify-first, budget enforcement).
- `summit/`: UI specs for evidence, witness, replay/audit export, and wedge-specific views.

## Non-Negotiables

1. Never pass unverified evidence to an LLM (`mc/guardrails/verify_first.md`).
2. All policy decisions must be recorded with decision IDs in witness chains.
3. Privacy budgets and rate limits are enforced for OSINT execution.
4. Determinism tokens are required for any replayable analytics.
