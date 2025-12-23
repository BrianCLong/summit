## 2025-12-23 - Jest Mock Implementation Reset
**Learning:** The `jest.config.ts` has `resetMocks: true` enabled. This wipes out `jest.mock()` implementations before every test, resetting them to `undefined`.
**Action:** When mocking dependencies in this codebase, always restore mock implementations in `beforeEach()` or use `jest.spyOn().mockImplementation()` inside the test, instead of relying solely on the factory in `jest.mock()`.
