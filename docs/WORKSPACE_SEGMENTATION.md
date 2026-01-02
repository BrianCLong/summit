# Workspace Segmentation & Turborepo Boundaries

This document explains how we segment the monorepo for Turborepo, how caching boundaries map to real code paths, and what commands developers should use locally and in CI.

## Repository Segments

| Segment            | Paths                                         | Notes                                            |
| ------------------ | --------------------------------------------- | ------------------------------------------------ |
| Applications       | `apps/*`, `client`                            | Next.js/Vite frontends and workflow engines      |
| Services           | `services/*`, `server`                        | Node/GraphQL APIs, workers, and gateway services |
| Packages & SDKs    | `packages/*`, `sdk/*`, `libs/*/node`          | Shared libraries, types, and SDKs                |
| Tools              | `tools/*`, `devtools/*`                       | CLIs and operational tooling                     |
| Data/Infra Bundles | `prov-ledger-service`, `companyos/services/*` | Deployable system bundles                        |

## Turborepo Pipeline (turbo.json)

The `turbo.json` pipeline is segmented by the directories above to prevent cache pollution across unrelated areas:

- **lint** and **typecheck** read only code-bearing paths under `apps/`, `services/`, `packages/`, `client/`, `server/`, `libs/`, and `tools/` plus shared config (`package.json`, `tsconfig*.json`, `.eslintrc.*`).
- **build** depends on upstream builds (`^build`) and scopes inputs to `src/` and `public/` inside each segment. Outputs are limited to `dist/**`, `build/**`, `.next/**`, and `out/**`.
- **test** depends on `build`, caches results, and captures `coverage/**`, `test-results/**`, `junit.xml`, and `playwright-report/**`.
- **test:integration** depends on `build` but **is not cached** to avoid stale integration output.
- **smoke** depends on `build` and skips caching; **dev** tasks remain persistent and uncached.

Global dependencies now include `pnpm-workspace.yaml`, `turbo.json`, and shared TS config so cache keys invalidate when workspace boundaries change.

## Day-to-Day Commands

Run tasks per segment with `--filter` to avoid touching unrelated workspaces:

- Lint: `pnpm turbo run lint --filter=client` (or `--filter=services/...` as needed)
- Typecheck: `pnpm turbo run typecheck --filter=apps/webapp`
- Build: `pnpm turbo run build --filter=server`
- Tests: `pnpm turbo run test --filter=packages/*`
- Integration tests: `pnpm turbo run "test:integration" --filter=services/api`

The existing golden path (`make bootstrap && make up && make smoke`) is unchanged, but Turborepo now aligns caches with the segments above.

## Migration Notes (Developers & CI)

- **Developers:** prefer `pnpm turbo run <task> --filter=<workspace>` instead of repository-wide runs when touching a single service or app. Coverage and fuzz gates remain available through `pnpm --filter intelgraph-server run test:unit -- --coverage` and `pnpm test:fuzz:graph-guardrails -- --runInBand`.
- **CI:** workflows that call `turbo run build|test|lint` will now get correct cache busting when files move between `apps/`, `services/`, `packages/`, `client/`, and `server/`. Integration tasks remain uncached to stay deterministic.
- **Caching Safety:** Outputs are constrained to build/test artifacts only; changing shared config (`pnpm-lock.yaml`, `tsconfig*.json`, `turbo.json`) automatically invalidates caches.

## Troubleshooting

- If a task is unexpectedly cached, verify the inputs for that pipeline stage include your path and check that `pnpm-workspace.yaml` lists the package.
- If you add a new workspace directory, update both `pnpm-workspace.yaml` and `turbo.json` to include it so segmentation stays accurate.
