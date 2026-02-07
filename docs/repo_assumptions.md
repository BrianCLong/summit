# Repo Assumptions & Verification

## Verified (Current State)

| Item | Evidence |
| --- | --- |
| Monorepo structure with `services/` and `src/` | Root directory layout |
| `src/` contains core logic and libraries | Root directory layout |
| `services/evals` exists with `runner.ts` | Root directory layout |
| `src/cli` exists | Root directory layout |
| `docs/standards/`, `docs/security/data-handling/`, and `docs/ops/runbooks/` exist | Directory layout |
| pnpm workspace is in use | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` |

## Deferred Pending Validation

| Item | Reason | Validation Plan |
| --- | --- | --- |
| UI is Next.js or compatible | Deferred pending repo scan | Inspect `apps/` or `client/` package.json |
| Testing stack includes Playwright/Vitest | Deferred pending repo scan | Search for Playwright/Vitest configs |
| Policy-as-code enforcement exists | Deferred pending evidence | Locate enforcement scripts and gates |
| Feature flag mechanism exists | Deferred pending evidence | Confirm `feature-flags`/`flags` usage |

## Validation Checklist

- [ ] Confirm UI framework (Next.js or other) in `apps/` or `client/`.
- [ ] Confirm test stack (`playwright`, `vitest`, `jest`) in root configs.
- [ ] Locate policy enforcement gate scripts.
- [ ] Locate feature flag wiring and default-off behavior.

## Plan Deviation (Current)

- Documentation-only changes scoped to standards, security data handling, and ops runbooks.
