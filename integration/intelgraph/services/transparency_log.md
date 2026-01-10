# Transparency Log Service

## Purpose

Stores append-only records for artifacts and compliance decisions, with hash chaining and
verifiable proofs.

## Responsibilities

- Append log entries with hash chaining.
- Provide proof bundles for auditors.
- Enforce retention policies and access controls.

## Interfaces

- `POST /log`: append a log entry.
- `GET /log/{id}`: retrieve entry with hash proof.

## Observability

- Metrics: `log_append_latency`, `log_chain_gap`.
- Logs: policy references and artifact IDs.
