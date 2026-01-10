# Replay Tokens

Replay tokens bind runs to data snapshots and code versions for reproducibility.

## Fields

- Determinism seed and dataset snapshot identifier.
- Interface version set and policy/redaction profile.
- Resource budgets (runtime, memory) enforced during replay.

## Generation

- Emit tokens after each validated run and log them in the transparency log.
- Support counterfactual tokens that modify policies for delta analysis.

## Verification

- Evaluators recompute hash commitments referenced by the token to verify integrity.
