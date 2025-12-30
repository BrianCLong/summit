# Compatibility Shims and Proofs

## Shim Generation
- Generate rewrite rule sets mapping prior client requests to updated schema actions.
- Validate rule termination and determinism.
- Enforce policy invariants during rule generation.

## Verification & Proofs
- Verify type correctness for fields referenced by prior action signatures.
- Optionally run shadow execution of prior vs updated requests and compute deterministic diffs.
- Produce compatibility proof object committing to schema delta, shim, verification outputs, and deterministic diffs.
- Emit breakage certificate identifying minimal breaking change set when compatibility fails.
- Witness chain records migration steps on stored data.
