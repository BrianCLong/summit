# Policy Gateway Service

## Purpose

Central policy-as-code enforcement for all wedges, including authorization, disclosure constraints,
and quarantine actions.

## Responsibilities

- Evaluate policy rules for requests.
- Return policy effects with constraints.
- Log compliance decisions for auditability.

## Interfaces

- `POST /policy/evaluate`: evaluate policy for a request.
- `GET /policy/decisions/{id}`: retrieve policy decision details.

## Decision Logging

Each decision records:

- `decision_id`, `policy_bundle_hash`, `effect`, `constraints`, `timestamp`.
- Request context summary and tenant scope.

## Observability

- Metrics: `policy_eval_latency`, `policy_denied_total`, `policy_quarantine_total`.
