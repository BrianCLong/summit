# Maltego JPC Specification

## Concept

Join-Preserving Compilation (JPC) compiles transform workflows into minimal
source query sets while preserving join semantics, producing join preservation
certificates for audit.

## Goals

- Reduce source calls and egress.
- Preserve join semantics from workflow plan.
- Provide verifiable reconstruction metadata.

## Processing flow

1. Lower workflow specification into a plan IR with explicit joins.
2. Compile plan IR into minimal source queries subject to constraints.
3. Execute source queries and reconstruct joined outputs.
4. Emit join preservation certificate with witness chain.

## Outputs

- **Joined output graph** with provenance annotations.
- **Join preservation certificate** with plan hash, query signatures, and
  witness chain.
