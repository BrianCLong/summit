# Sandbox Runtime Service

## Purpose

Executes analytics or transform workloads in a policy-qualified sandbox with resource limits and
attestation support.

## Responsibilities

- Enforce CPU, memory, and wall-time limits.
- Provide runtime attestation statements.
- Emit execution reports for compliance artifacts.

## Interfaces

- `POST /sandbox/execute`: execute workload within sandbox.
- `GET /sandbox/reports/{id}`: retrieve execution report and attestation.

## Observability

- Metrics: `sandbox_exec_latency`, `sandbox_timeout_total`.
- Logs: execution reports with policy decision references.
