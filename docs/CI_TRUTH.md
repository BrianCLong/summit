# CI Truth Table

This document establishes the source of truth for our Continuous Integration pipeline. It defines what each command guarantees and, crucially, what it does _not_ guarantee due to current technical debt.

## Current State (Sprint N+1 Baseline)

- **@ts-ignore count**: ~426
- **@ts-nocheck count**: ~1180
- **Server CI Status**: Integrated into root build graph (previously ignored). currently failing or heavily suppressed.

## Command Guarantees

| Command          | What it Proves                                                           | What it does NOT prove                                                                                                                                                                                                             |
| :--------------- | :----------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`     | The code compiles into artifacts without syntax errors.                  | Does not prove runtime stability or logical correctness. Silent failures may exist if `ts-ignore` is used.                                                                                                                         |
| `pnpm lint`      | Code adheres to ESLint and formatting rules.                             | Does not prove logical correctness or type safety.                                                                                                                                                                                 |
| `pnpm typecheck` | The TypeScript compiler (`tsc`) runs on all projects including `server`. | **PARTIALLY TRUTHFUL.** We have integrated `server` into the build graph, but thousands of files are either explicitly ignored via `@ts-nocheck` or failing compilation. A green build currently requires significant suppression. |
| `pnpm test`      | Unit tests execute and pass.                                             | Does not guarantee high coverage or integration stability.                                                                                                                                                                         |

## Goals

1.  **Eliminate `@ts-nocheck`**: Every file must be subject to type checking.
2.  **Eliminate `@ts-ignore`**: Use proper type assertions or fix the underlying type errors.
3.  **Strict CI**: CI must fail if any of these commands fail.

## Progress Log

- **Step 1**: Added `server` to root `tsconfig.json` references.
- **Step 2**: Configured `server/tsconfig.json` as `composite: true` and removed blanket exclusions for `src/lib`.
- **Step 3**: Fixed `server/src/lib/telemetry/comprehensive-telemetry.ts` to pass strict checks.
