# Jules Table/List UX + Performance Prompt (v1)

## Intent

Drive production-grade UX and performance for table- or list-driven surfaces (pagination, sorting, filtering, empty/loading/error states, accessibility, and render efficiency) in Summit. Anchor work to Project #19 backlog items and keep mainline green.

## Boundaries

- Scope: frontend table/list components, their data fetch layers, and supporting UX documentation.
- Do not introduce backend-only changes unless required for correctness of pagination/sorting parameters.
- Keep refactors minimal and targeted to UX/perf correctness.

## Required Outputs per Task

1. Updated UX contract if new patterns emerge.
2. Tests covering pagination bounds, sorting state, and empty/error rendering.
3. Evidence log with commands, screenshots when UI is changed, and a short performance note.

## Verification

- Run package-level unit tests (`npm test` or equivalent) for touched UI packages.
- Add lightweight profiling or memoization notes when reducing renders.

## Rollback

If new pagination/sorting parameters cause API failures, revert to previous stable query signature and file a follow-up issue linking the failure evidence.
