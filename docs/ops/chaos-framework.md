# Chaos Engineering Seed Framework

This document defines the initial, tightly scoped chaos engineering framework for Summit. The goal is to surface latent weaknesses early by deliberately injecting failures in **development** and **staging** only.

## Safe Environments

- **Allowed:** `dev`, `development`, `stage`, `staging`, `test`.
- **Forbidden:** `prod`, `production`, any undefined or unrecognized environment.
- Chaos controls must default to **off** and remain hard-disabled in production. Feature flags or environment variables cannot override the production ban.

## Fault Types

Supported failure modes are intentionally narrow to keep blast radius small:

1. **Latency injection** – add deterministic or randomized delay before backend calls.
2. **Error injection** – probabilistic failures surfaced as synthetic 5xx/transport errors.
3. **Connection drop** – simulate backend unavailability by short-circuiting calls.
4. **Throttling** – impose artificial rate/throughput limits per service category.

### Service Categories in Scope

- **Neo4j / graph adapters** (storage and query path).
- **LLM providers / model adapters**.
- **Redis, queues, and cache adapters**.
- **Maestro orchestration and scheduler calls**.

## Guardrails & Blast Radius Controls

- Chaos is **opt-in** and must be explicitly enabled per environment. Default: **disabled**.
- Environment gate refuses activation in production.
- Per-service kill switch via `CHAOS_DISABLE_SERVICE` (comma-separated list: `neo4j,llm,redis,maestro,...`).
- Fault budgets:
  - `CHAOS_ERROR_RATE` (0–1, defaults to `0`).
  - `CHAOS_LATENCY_MS` (integer milliseconds, defaults to `0`).
- Blast radius limits:
  - Faults apply only to wrapped backend calls (LLM adapters, graph connectors, queues, orchestration calls).
  - Test-only HTTP endpoint toggles chaos and exposes current configuration/state; it is unreachable in production.
- Observability:
  - Emit structured logs and counters when a fault is injected (service, fault type, correlation id if present).
  - Surface metrics via existing Prometheus/export endpoints so alerting can watch for unexpected fault rates.

## Operational Playbook

1. **Enable safely**: set the environment to `dev` or `staging`, then toggle chaos via the internal endpoint (or `CHAOS_ENABLED=true`).
2. **Select faults**: provide `CHAOS_LATENCY_MS`, `CHAOS_ERROR_RATE`, and `CHAOS_DISABLE_SERVICE` to scope impact.
3. **Observe**: watch emitted logs/metrics for injected faults; validate timeouts/retries and degradation behavior.
4. **Disable fast**: POST to the internal endpoint with `enabled: false` or clear env flags; production remains locked out automatically.

## Usage Summary

| Control                 | Purpose                           | Example                           |
| ----------------------- | --------------------------------- | --------------------------------- |
| `CHAOS_ENABLED`         | Master toggle (default off)       | `CHAOS_ENABLED=true`              |
| `CHAOS_LATENCY_MS`      | Inject delay before backend calls | `CHAOS_LATENCY_MS=150`            |
| `CHAOS_ERROR_RATE`      | Random failure probability (0–1)  | `CHAOS_ERROR_RATE=0.05`           |
| `CHAOS_DISABLE_SERVICE` | Disable one or more services      | `CHAOS_DISABLE_SERVICE=llm,neo4j` |

Use the internal `/internal/chaos` endpoint to read/adjust live configuration in safe environments; it returns the active guardrails, counters, and enabled status.
