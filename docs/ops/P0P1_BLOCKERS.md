# P0/P1 Blockers

This document lists all verified P0 (critical) and P1 (high-severity) blockers that currently prevent the repository from being in a clean, "green-by-default" state. A release cannot proceed until these issues are either fixed or explicitly quarantined by policy.

## Current Blockers (as of 2026-01-19)

| ID               | Blocker                               | Details                                                                                                                                                                              | Status     | Owner    | Verification                             |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ---------------------------------------- |
| **P0-BUILD-001** | `apps/gateway` build failure          | The `@intelgraph/gateway` package fails to build due to a TypeScript `rootDir` misconfiguration (TS6059). Imports from outside the `src` directory are not being resolved correctly. | **Active** | Jules    | `cd apps/gateway && pnpm build`          |
| **P0-BUILD-002** | `apps/mobile-interface` build failure | The `apps/mobile-interface` package fails its `next build` with an error related to `pify`.                                                                                          | **Active** | Claude   | `cd apps/mobile-interface && pnpm build` |
| **P1-TEST-001**  | `apps/a11y-lab` test failure          | The `apps/a11y-lab` package has failing tests due to missing Playwright browser dependencies in the test environment.                                                                | **Active** | Ops Team | `cd apps/a11y-lab && pnpm test`          |
| **P1-DEBT-001**  | Mixed Test Runners                    | The repository uses multiple test runners (Jest, Vitest, Playwright), increasing maintenance overhead and cognitive load.                                                            | **Active** | Jules    | `pnpm ops:readiness`                     |
| **P1-DEBT-002**  | Zod Version Mismatch                  | The `server` package uses Zod v3, while the `web` package uses v4. This creates dependency conflicts and potential for subtle bugs.                                                  | **Active** | Jules    | `pnpm ops:readiness`                     |
