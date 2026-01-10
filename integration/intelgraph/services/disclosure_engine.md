# Disclosure Engine Service

## Purpose

Applies disclosure constraints to outputs (aggregation, redaction, k-anonymity, differential
privacy, egress caps).

## Responsibilities

- Apply policy-defined disclosure transforms.
- Generate disclosure reports and commitments.
- Emit compliance logs when constraints alter outputs.

## Interfaces

- `POST /disclosure/transform`: apply transformations to payload.
- `POST /disclosure/verify`: verify transformed outputs against constraints.

## Observability

- Metrics: `disclosure_transform_latency`, `disclosure_suppression_rate`.
- Logs: policy decision references and output summaries.
