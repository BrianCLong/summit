# ADR-2026-03-17 — Observability First Telemetry SDKs & SLO Kits

## Status

Accepted

## Context

The portfolio lacks a paved road for service teams to adopt consistent metrics, logs, and traces. Existing telemetry relies on ad-hoc OpenTelemetry configuration, diverging metric names, and no shared SLO guardrails. This creates blind spots in release readiness reviews, complicates Friday evidence checkpoints, and increases the risk of cost overruns from unbounded cardinality.

## Decision

We will ship a six-week Observability First track that wraps OpenTelemetry in curated SDKs for Go, TypeScript, and Python. The SDKs expose one-line initialization that standardizes trace propagation, structured logging, and metric naming. We pair the SDKs with a golden Grafana dashboard kit, multi-window SLO alert policies, synthetic probes, and evidence capture templates. CI and cluster admission hooks will verify signed artifacts (provenance + cosign) for the telemetry collectors.

## Consequences

- Teams can instrument services with a single import, gaining golden dashboards, alerting, and runbooks by default.
- Portfolio rhythm improves because Monday stand-ups and Friday evidence reviews share the same metrics catalogue and alert drill logs.
- We must maintain default sampling (5% traces) and PII redaction filters to stay under the 5% tracing overhead and 0.1% log drop rate SLOs.
- The SDKs and dashboards become a dependency for new services; future changes require versioning and compatibility testing.
