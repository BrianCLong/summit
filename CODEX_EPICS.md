# Codex Multi-Epic Assignment Overview

This repository snapshot includes nine parallel epics that can be handed directly to separate Codex teams. Each epic is self-contained with strict scope boundaries and a clear Definition of Done. Use this document as a quick handoff guide to ensure teams stay within their allowed paths and validation commands.

## Epics at a Glance

1. **Policy/ABAC + OPA Enforcement Hardening** (Team: `POLICY`)
   - Scope: `server/src/policy/**`, `policies/opa/**`, `policies/tests/**` (optionally `server/src/conductor/policy/**` if already used)
   - Key goals: ABAC/residency/export correctness, observability, decision caching, input validation, expanded Rego coverage, golden tests.
   - Required commands: `pnpm -w policy:test`, `pnpm --filter server test`, `pnpm -w lint`, `pnpm -w typecheck`.

2. **Provenance Ledger + Evidence Export Pack** (Team: `PROVENANCE`)
   - Scope: `server/src/provenance/**`, `server/src/maestro/evidence/**`, `server/src/maestro/provenance/**`, optional `server/src/conductor/api/evidence-routes.ts`.
   - Key goals: deterministic merkle verification, bundle export/verify endpoints, canonical hashing, threat model, structured logging.
   - Required commands: `pnpm --filter server test`, `pnpm -w lint`, `pnpm -w typecheck`.

3. **Contract-First Data Pipelines + Connector Reliability** (Team: `PIPELINES`)
   - Scope: `server/data-pipelines/**`.
   - Key goals: versioned contracts, validation utility + harness, connector retries/idempotency, Airflow example DAG, regression tests.
   - Required commands: connector-specific tests/harness; no JS/TS changes.

4. **Analyst Workbench UX Polish + Performance** (Team: `WORKBENCH-UI`)
   - Scope: `client/src/components/**` and related client utilities.
   - Key goals: saved filters, breadcrumbs, provenance chips, accessibility, performance telemetry, empty/error states, Playwright coverage.
   - Required commands: `pnpm --filter client lint`, `pnpm --filter client typecheck`, `pnpm --filter client test:mcp`, `pnpm --filter client test:golden-path`.

5. **AI Assistant UX: Safer Prompts + Explainability** (Team: `AI-UX`)
   - Scope: `client/src/components/ai/**` (plus minimal helpers under `client/src/components/common/**`).
   - Key goals: prompt templates, responsible-use gating, reasoning sources panel, export stub, refusal templates, preset flows, injection-safety tests.
   - Required commands: `pnpm --filter client lint`, `pnpm --filter client typecheck`, applicable client tests.

6. **Maestro Conductor Reliability + Routing** (Team: `MAESTRO`)
   - Scope: `server/src/maestro/**`.
   - Key goals: deterministic routing records, idempotency keys, retry policies, executor health checks/timeouts, provenance trace events, end-to-end integration tests.
   - Required commands: `pnpm --filter server test`, `pnpm -w lint`, `pnpm -w typecheck`.

7. **Observability + FinOps Budgets** (Team: `OBSERVABILITY`)
   - Scope: `server/src/observability/**` (optional `scripts/otel-smoke.js`).
   - Key goals: standardized metrics/labels, budget gate helper, finops dashboard updates, latency histograms, budget config schema, telemetry tests, docs.
   - Required commands: `pnpm --filter server test`, `pnpm -w lint`, `pnpm -w typecheck`.

8. **Supply Chain + CI Security Gates** (Team: `SECURITY-GATES`)
   - Scope: `.github/**` (and existing security tool configs).
   - Key goals: additive CI jobs (policy tests, SBOM, audits, SLSA checks), CodeQL tuning, weekly hygiene report, signed image gate, docs.
   - Required commands: validate workflow YAML; avoid app code changes.

9. **Server Performance & Reliability Utilities** (Team: `PERF-RELIABILITY`)
   - Scope: `server/src/cache/**` (instrumentation-only touches to `server/src/observability/**` if needed; minimal `server/src/bootstrap/**`).
   - Key goals: cache key builder, SWR option, rate limiter, circuit breaker, cache metrics, tag-based invalidation, micro-benchmark, README.
   - Required commands: `pnpm --filter server test`, `pnpm -w lint`, `pnpm -w typecheck`.

## Cross-Team Operating Principles

- **One task → one PR.** Keep diffs small and avoid touching files outside each epic’s scope to prevent merge conflicts.
- Prefer **additive changes** (new files) over modifications to shared configs or lockfiles.
- Every PR must include relevant **tests** and adhere to the Definition of Done for its epic.
- Use **pnpm** for all scripts; never modify root lockfiles unless explicitly scoped.
- Follow repo conventions in `AGENTS.md` and existing coding standards (TypeScript types, lint/typecheck clean).
- Provide concise PR descriptions with validation commands run and artifacts (e.g., SBOM, test results) when applicable.

This overview is meant as a quick coordination guide so teams can start immediately while respecting guardrails and required checks.
