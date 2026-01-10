# Evaluator API Gateway

The Evaluator API Gateway exposes IEAP, VCEC, MPEP, EBLE, and ICD-RAM endpoints with
rate limiting, deterministic execution guards, and policy-as-code enforcement.

## Responsibilities

- Authenticate evaluator clients and validate scope tokens.
- Route interface calls to the appropriate component runtime.
- Enforce compute budgets and policy profiles.
- Emit structured audit events to the transparency log.

## Inputs

- Determinism token
- Policy profile
- Conformance suite version

## Outputs

- Run IDs
- Proof objects and witness chains
- Transparency log receipts

## Operational Guarantees

- All requests are idempotent when replay token is provided.
- Budget breaches return deterministic error codes and are recorded in proof objects.
