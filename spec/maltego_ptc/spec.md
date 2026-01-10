# PTC Spec Overview

Defines the Maltego wedge for Provenance-Typed Transform Contracts.

## Goals

- Register transforms with effect declarations and disclosure constraints.
- Execute transforms only when authorized by policy-as-code.
- Produce proof-carrying artifacts with witness records and provenance.

## Inputs

- Transform specification (effects, disclosure, provenance guarantees).
- Input entities and subject context.
- Policy bundle and disclosure budgets.

## Outputs

- Transform artifact with witness record and provenance record.
- Redacted/bounded output entity set.
- Replay token for deterministic execution review.

## Processing Stages

1. **Register** transform specs in registry.
2. **Authorize** via policy engine for subject + purpose.
3. **Execute** in sandbox with runtime limits.
4. **Package** witness and provenance records into capsule.
