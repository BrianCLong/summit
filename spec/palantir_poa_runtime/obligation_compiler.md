# Obligation Compiler (POAR)

## Responsibilities

- Parse action specifications and lower into execution plans with effect annotations.
- Attach policy, disclosure, invariant, and budget obligations based on action intent and subject context.
- Produce determinism seeds and plan hashes for replay.

## Verification

- Static analysis to block EXPORT effects absent authorization tokens.
- Validate disclosure transformations (k-anonymity, suppression, aggregation, byte limits).
- Cache compiled plans by action signature + policy version to accelerate re-use.
