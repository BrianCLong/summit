# Failure Analysis: Targeted Diagnostics (Smoke Suite)

## Diagnostics Executed

- **Command:** `npm test -- --runInBand --testPathPattern smoke`
- **Scope:** Jest-driven smoke suites across services, client, and end-to-end directories.
- **Outcome:** 14 suites discovered; 12 failed before assertions due to compilation/type orchestration issues; 2 passed legacy JS smoke suites. Only 4 assertions ran successfully, indicating pre-execution failures dominate current signal.

## Observed Failure Modes

1. **Missing Node typings for TypeScript smoke scripts**
   - _Symptoms:_ TypeScript cannot resolve built-in modules (`child_process`, `path`, `fs`, `url`, `crypto`) and globals (`Buffer`, `process`) within `services/prov-ledger/src/scripts/smoke.test.ts`.
   - _Likely Root Cause:_ Jest/ts-jest uses a config without `types: ["node"]` and possibly an incompatible `module` target for `import.meta`. The workspace lacks explicit `@types/node` in the prov-ledger package scope.
   - _Mitigation:_ Add `@types/node` as a devDependency for the prov-ledger package, ensure the smoke tsconfig extends a base that includes Node libs, and set `module` to `node18`/`nodenext` for tests. High confidence because errors block type resolution deterministically.
   - _Confidence:_ **High (p ≈ 0.9)** — deterministic compiler errors reproduce on every run until configuration is fixed.

2. **Playwright suites executed inside Jest**
   - _Symptoms:_ Multiple Playwright test files under `client/tests`, `tests/e2e`, and `tests/smoke` throw "Playwright Test needs to be invoked via 'npx playwright test'" when run by Jest.
   - _Likely Root Cause:_ Jest's testPathPattern `smoke` sweeps Playwright specs; no Jest ignore/glob segregation for E2E suites.
   - _Mitigation:_ Exclude Playwright directories from Jest via `testPathIgnorePatterns`, or move Playwright specs under a folder only exercised by `npx playwright test`. Adjust CI to run Playwright independently. Confidence high because Playwright explicitly aborts in Jest context.
   - _Confidence:_ **High (p ≈ 0.9)** — failure is systemic across all Playwright specs.

3. **Database repository type mismatch**
   - _Symptoms:_ `server/src/maestro/runs/runs-repo.ts` reports `ManagedPostgresPool` missing Pool properties.
   - _Likely Root Cause:_ Type definition drift between `ManagedPostgresPool` and expected `Pool` interface; wrapper type not exposing required fields in typings.
   - _Mitigation:_ Align `ManagedPostgresPool` to extend `Pool` typings or update consumer signatures to accept wrapper-specific shape. Consider adding an adapter returning the underlying pool. Confidence moderate due to type-only failure prior to runtime.
   - _Confidence:_ **Medium (p ≈ 0.6)** — inferred from type error without runtime context.

4. **Client smoke tests fail to transpile JSX/ESM**
   - _Symptoms:_ Client smoke suites (archived and active) throw "SyntaxError: Cannot use import statement outside a module" under Jest.
   - _Likely Root Cause:_ Jest transform configuration does not handle JSX/ESM for these paths; `transformIgnorePatterns` and Babel/ts-jest mappings likely missing for `client/src/__tests__` and archived directory.
   - _Mitigation:_ Add Babel/Jest transformer (e.g., `babel-jest`) for client smoke paths or convert tests to TypeScript processed by ts-jest with `allowJs`/`jsx` enabled. Alternatively, relocate legacy tests to a supported runner. Confidence high because Jest stops at parsing step.
   - _Confidence:_ **High (p ≈ 0.85)** — repeated parser errors across three files.

5. **JS smoke tests processed by ts-jest without allowJs**
   - _Symptoms:_ ts-jest warns when compiling `.js` smoke tests (server and client) because `allowJs` is disabled.
   - _Likely Root Cause:_ Global ts-jest transformer matches JS files unintentionally.
   - _Mitigation:_ Add `allowJs: true` in the relevant tsconfig or narrow the Jest transform regex to exclude plain JS files. Confidence medium because warnings did not fail the suite but indicate configuration debt.
   - _Confidence:_ **Medium (p ≈ 0.55)** — warnings only, not fatal currently.

## Negative Results and Coverage Gaps

- No functional assertions from Playwright or TypeScript smoke suites executed due to pre-runtime failures, leaving coverage gaps in E2E health, auth, GraphQL persisted query enforcement, and prov-ledger signing paths. Current observable pass rate is **4/4 tests (100%)**, but across 14 suites **only 2/14 suites (14%)** completed, so functional confidence is low despite passing assertions.
- Database smoke coverage is blocked at type-check time; runtime health of DB interactions remains unverified.

## Recommended Next Actions

1. Partition Jest vs Playwright suites and update Jest `testPathIgnorePatterns` to skip Playwright files; run Playwright via `npx playwright test` in CI and locally.
2. Standardize test tsconfig (Node types, module target) for service smoke scripts and install `@types/node` where missing.
3. Fix `ManagedPostgresPool` typings or usage to satisfy `Pool` interface expectations before re-running smoke tests.
4. Add JSX/ESM transpilation support (Babel/ts-jest `allowJs` + `jsx`) for client smoke suites or migrate them to TypeScript/Jest presets.
5. Re-run `npm test -- --runInBand --testPathPattern smoke` after configuration fixes; aim for ≥90% suite pass rate to restore confidence.
