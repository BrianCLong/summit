# Prompt: Sigstore fail-closed smoke harness (2026-02-07)

## Objective

Implement deterministic, fail-closed Sigstore negative-case smoke tests that cover Cosign bundle mismatch acceptance and Rekor COSE malformed-entry 500 behavior. Emit evidence reports and update roadmap status.

## Scope

- Add smoke runner and evidence schema under `src/agents/supplychain/sigstore_smoke/`.
- Add tests in `tests/sigstore/`.
- Add standards + data handling + runbook docs.
- Update `docs/roadmap/STATUS.json`.

## Constraints

- No refactors.
- Fail closed on any ambiguity.
- Deterministic evidence outputs only.
