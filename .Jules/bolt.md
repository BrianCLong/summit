## 2025-12-23 - Jest Mock Implementation Reset
**Learning:** The `jest.config.ts` has `resetMocks: true` enabled. This wipes out `jest.mock()` implementations before every test, resetting them to `undefined`.
**Action:** When mocking dependencies in this codebase, always restore mock implementations in `beforeEach()` or use `jest.spyOn().mockImplementation()` inside the test, instead of relying solely on the factory in `jest.mock()`.

## 2025-12-24 - Jest and import.meta
**Learning:** Jest environments, even with `useESM: true`, can struggle with `import.meta` in code that attempts to run in both CJS and ESM environments.
**Action:** When testing code that uses `import.meta`, ensure to mock the module containing it if the test runner cannot handle the specific conditional checks.
