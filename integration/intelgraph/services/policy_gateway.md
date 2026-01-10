# Policy Gateway Service

## Responsibilities

- Evaluate policy-as-code obligations for actions and disclosures.
- Bind decisions to subject context, purpose, and policy version.
- Emit decision logs and determinism tokens.

## Inputs

- Subject context, purpose, action plan hash.
- Policy version and disclosure obligations.

## Outputs

- Policy decision ID, allow/deny verdict, evaluation trace.
- Determinism token binding data snapshot and policy version.

## Dependencies

- Policy engine (OPA).
- Transparency log for decision digests.

## SLIs/SLOs

- Decision latency p95 < 250ms.
- Error rate < 0.1%.
