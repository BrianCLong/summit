# CI Runbook

This runbook documents the streamlined CI model for Summit, how to debug failures, and what contributors must run locally.

## Workflows and responsibilities

- **Fast lane**: `ci-lint-and-unit.yml`
  - Triggers: `pull_request` → `main`, `push` → `main`.
  - Steps: Node 20 + pnpm install with cache, TypeScript type-check, ESLint, and unit tests.
  - Purpose: quick feedback for PRs and branch protection.

- **Golden path**: `ci-golden-path.yml`
  - Triggers: `push` → `main`, `workflow_dispatch`, nightly schedule.
  - Steps: `make bootstrap`, `make up`, wait for health endpoints, `make smoke`, collect docker logs as artifacts, tear down stack.
  - Purpose: enforce the deployable-first golden path on `main`.

- **Security**: `security.yml` (or the current canonical security workflow)
  - Triggers: `push` → `main`, weekly schedule.
  - Steps: dependency and secret scanning; may reuse existing security composite actions.
  - Purpose: continuous SCA coverage without slowing PR velocity.

- **Auto update + merge train**
  - Workflow: “Auto Update PRs (safe)” keeps PRs current with `main` when opted in by label.
  - Label `automerge-safe` (or `merge-train`) gates the merge train; the train updates from `main`, waits for the required checks above, merges clean PRs, and stops on the first failure to keep `main` green.

## Required checks for `main`

Set the following GitHub required status checks once the workflows are active:

- `ci-lint-and-unit / lint-and-unit`
- `ci-golden-path / golden-path`
- `security / security-scan`

## Local pre-flight commands

Run the golden path locally before opening a PR:

```bash
./start.sh
# or
make bootstrap && make up && make smoke
```

For quick iteration on app code, you can also run targeted checks:

```bash
pnpm -w install
pnpm lint
pnpm test
pnpm typecheck
```

## Debugging tips

- **Fast lane failures**: Check ESLint/type errors in the failing package. Re-run `pnpm lint`, `pnpm test`, and `pnpm typecheck` locally with `pnpm -w install` to ensure workspace deps are available.
- **Golden path failures**: Review attached docker logs (API, web, DB). Reproduce locally with `make bootstrap && make up && make smoke`. Ensure `scripts/wait-for-*` probes succeed and ports are free.
- **Security failures**: Update vulnerable packages, regenerate lockfiles, or mark false positives per tool guidance. Re-run the security workflow locally if a script is available under `.ci/`.
- **Merge train stalls**: If a PR consistently fails, remove the `automerge-safe` label and leave a comment with the failing check. Resolve conflicts before re-queuing.

## Observability coverage

- Grafana dashboard: `ops/observability/grafana/dashboards/golden-path-service-health.json` tracks error rate, throughput, and latency (p50/p95/p99) for `intelgraph-api`, `intelgraph-gateway`, and `intelgraph-ingest`. Filter by environment or service to validate golden-path health before/after CI runs.
- Prometheus alert rules: `ops/alerts/golden-path-alerts.yml` raises PagerDuty-bound alerts for error rate spikes (>1%), latency regressions (p95 > 1.2s for 10m), and unexpected throughput drops (<5 rps sustained).
- On-call runbook: see `RUNBOOKS/golden-path-observability.md` for step-by-step response guidance (dashboard drilldowns, PromQL spot-checks, rollback/scale levers) when CI or post-deploy checks surface regression signals.
