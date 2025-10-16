# Runbook Card — Scoped CI

**Purpose:** accelerate PR feedback by running checks only where paths change.

## How it works

- `dorny/paths-filter` determines whether files under a scope changed.
- If changed, it runs setup → lint → typecheck → test → build on Node 20 with pnpm cache.
- Callers: `ci.pr.apps.yml`, `ci.pr.services.yml`, `ci.pr.packages.yml`.

## Tips

- Tune `include_globs`/`exclude_globs` per workspace.
- For slow builds, introduce `--filter` or `turbo` task scoping.
- Add more callers (e.g., `docs/**`, `infra/**`) as repos evolve.
