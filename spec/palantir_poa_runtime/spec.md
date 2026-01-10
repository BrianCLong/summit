# Palantir POAR Specification

## Concept

Proof-Obligation Action Runtime (POAR) compiles actions into proof
obligations that must be satisfied prior to execution. It outputs a proof
object binding the execution plan, policy decisions, and transformed output.

## Goals

- Enforce policy, disclosure, and invariant obligations before execution.
- Produce portable proof objects with deterministic replay.
- Support verification without re-executing the action.

## Processing flow

1. Receive action specification and subject context.
2. Compile into execution plan + proof obligations.
3. Verify satisfiability of obligations using policy-as-code engine.
4. Execute plan in a sandbox with budgets.
5. Transform output to meet disclosure obligation.
6. Generate proof object and store in transparency log.

## Outputs

- **Transformed output**: redacted or aggregated output.
- **Proof object**: commitments to plan hash, policy decision ID, output hash,
  determinism token, optional attestation quote.

## Security & compliance

- Proof objects are signed and stored in append-only logs.
- All compliance decisions are logged for audit replay.
