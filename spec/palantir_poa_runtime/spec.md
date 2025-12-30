# Palantir Proof-Obligation Action Runtime (POAR) Specification

## Concept

Proof-Obligation Action Runtime turns analytics into proof-carrying actions. Each action compiles into an execution plan plus proof obligations (policy, disclosure, invariants). Execution proceeds only when obligations are satisfied, producing portable proof objects.

## Data model

- **Action specification**: Declarative intent with inputs, effects, and purpose.
- **Execution plan**: Lowered steps with effect annotations and resource budgets.
- **Obligations**: Policy, disclosure, invariant, and budget constraints bound to subject context and purpose.

## Processing flow

1. Receive action specification and compile to execution plan with attached obligations and determinism seeds.
2. Statically verify satisfiability (e.g., no EXPORT effects without authorization tokens).
3. Execute plan in sandbox enforcing runtime/memory limits and disclosure transformations.
4. Generate proof object committing to plan hash, policy decision ID, disclosure outputs, determinism token, and optional attestation quote.
5. Log proof object digest to transparency log and emit transformed output plus proof object.

## Outputs

- **Proof object**: Signed commitment with replay/attestation data and optional counterfactual variants.
- **Verifier interface**: Enables third parties to validate proof objects without rerunning computations.
