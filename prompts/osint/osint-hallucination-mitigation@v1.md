# Prompt: OSINT Hallucination Mitigation (v1)

## Objective

Establish provenance-required OSINT facts, deterministic evidence IDs, verifier
policy gates, and documentation for hallucination mitigation.

## Scope

- Add OSINT hallucination mitigation modules (facts, evidence IDs, verifier).
- Add acceptance tests for provenance, unknown degradation, verifier flags,
  two-source policy, and deterministic evidence IDs.
- Add documentation standards, data handling policy, and runbook.
- Update `docs/roadmap/STATUS.json`.

## Non-goals

- No production workflow rewrites.
- No CI workflow changes beyond local tests.

## Required Outputs

- Deterministic evidence ID logic.
- Provenance-required fact policy with degradable `unknown`.
- Verifier that flags unsupported claims without Evidence ID citations.
- Documentation artifacts aligning to Summit governance.
