# Proof Obligations

## Purpose

Proof obligations encode governance constraints as verifiable requirements
that must be satisfied before and during execution. They make compliance
portable via proof objects.

## Obligation types

- **Policy obligation**: access scope, purpose, subject context.
- **Disclosure obligation**: redaction, aggregation, egress limits.
- **Invariant obligation**: constraints on graph mutations or outputs.
- **Execution obligation**: sandbox budgets and isolation guarantees.

## Compilation guidance

- Compile obligations into a machine-checkable plan with explicit checks.
- Bind obligations to a policy version and data snapshot identifier.
- Emit preflight decisions with signed approvals when required.

## Verification flow

1. Resolve subject context and purpose.
2. Evaluate policy-as-code rules and disclosure constraints.
3. Verify that the execution plan contains no forbidden operations.
4. Generate a proof object upon successful completion.

## Outputs

- **Proof object**: commitments to plan hash, policy decision ID, output hash,
  determinism token, attestation quote (when enabled).
- **Decision log**: evaluation trace and rule identifiers.

## Security requirements

- Proof objects must be tamper-evident (signature + transparency log).
- All compliance decisions are logged for audit replay.
