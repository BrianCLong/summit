# Policy Gateway

## Purpose

Mediates policy-as-code authorization decisions for capsule and transform flows.

## Responsibilities

- Evaluate subject + purpose against policy bundle.
- Enforce disclosure budgets and sensitivity classes.
- Record decision identifiers in witness chains.

## Interfaces

- `POST /v1/policy/decide` for authorization decisions.
- `GET /v1/policy/bundles/{version}` for policy bundles.
