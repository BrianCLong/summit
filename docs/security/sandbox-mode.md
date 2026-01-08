# Sandbox Mode Specification

## Purpose

Sandbox mode limits the blast radius of automation and graph write operations by diverting high-impact mutations to an isolated namespace or disabling them outright. It is designed for validation, QA, and dry-runs where engineers want to observe side effects without touching production state.

## Definition

- **Activation flag:** `SANDBOX_MODE=true` (environment variable) or an explicit `sandboxMode` option in service constructors.
- **Write behavior:**
  - IntelGraph/Knowledge Graph writes are materialized into an in-memory **sandbox namespace** and are not merged into the production state. Snapshots are labeled with `sandbox: true` and include the active `namespace`.
  - Maestro Conductor self-healing plans are evaluated for observability but **not executed**; incidents are tagged as `sandboxed` and emit warnings.
- **Logging:** Each sandboxed operation emits a warning to make the isolation explicit in traces and logs.

## Promotion from Sandbox to Production

1. Run flows with `SANDBOX_MODE=true` to validate shape, counts, and safety logs.
2. Review warnings and any blocked mass-mutation errors (threshold defaults to 500 nodes/edges).
3. Provide explicit confirmation for high-impact actions:
   - Set `confirmationProvided: true` in code, or
   - Export `CONFIRM_INTELGRAPH_REFRESH=true` or `CONFIRM_MAESTRO_SELF_HEAL=true` for the relevant operation.
4. Unset `SANDBOX_MODE` (or set to `false`) and rerun after confirmation to allow production writes/automation.

## Safety Controls

- **Requires confirmation:** High-impact operations call `requiresConfirmation` to block execution until an explicit confirmation flag or environment override is present.
- **Mass-mutation guard:** `preventMassMutation` blocks graph writes exceeding the configured threshold (default 500 nodes/edges) unless `ALLOW_MASS_MUTATION=true` is set.
- **Warnings and namespace tagging:** Snapshots and incidents carry sandbox metadata so downstream systems can distinguish dry-run data from production state.

## Intended Coverage (Phase 1)

- IntelGraph/Knowledge Graph refresh pipeline (graph rebuilds, risk calculations).
- Maestro Conductor automation flows (anomaly-triggered self-healing plans).

Future phases can extend sandbox routing to data-plane APIs, additional write paths, and persistent storage adapters.
