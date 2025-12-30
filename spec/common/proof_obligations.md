# Proof Obligations for Policy-Carrying Actions

## Purpose

Turn actions and analytics into proof-carrying executions by compiling policy, disclosure, and invariant requirements into verifiable obligations.

## Building blocks

- **Obligation types**: Policy (authorization + purpose), disclosure (privacy/egress constraints), invariant (state change limits), budget (runtime/memory).
- **Compilation**: Translate high-level action specs into execution plans annotated with obligations and determinism seeds.
- **Verification**: Static checks for forbidden effects, sandboxing for runtime resource limits, and attestation for trustworthy execution.
- **Proof objects**: Signed commitments to plans, policy decisions, and transformed outputs; optionally logged in transparency ledgers.

## Operational guidance

- Prefer **append-only transparency logs** with Merkle commitments for tamper evidence.
- Support **counterfactual proofs** to compare alternative disclosure obligations.
- Include **replay tokens** (snapshot, seed, policy version) to enable deterministic re-validation by third parties.
