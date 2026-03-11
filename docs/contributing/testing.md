# Testing Locally

Summit has a strong emphasis on reliability. All code changes must be verifiable and robust. Testing is required for new features and bug fixes.

## 1. Running Tests

### Node.js (Frontend / Adapters / SDK)
- **Unit Tests:** `pnpm test` (Uses Jest)
- **E2E Tests:** `pnpm e2e` (Uses Playwright)
- **Adapter Tests:** `npx vitest run adapters/` (Uses Vitest)

### Python (Backend `summit/`)
- Ensure your `PYTHONPATH` is set when running tests.
- **Run all tests:** `cd summit && PYTHONPATH=.. python -m pytest .`
- **Run specific tests:** `cd summit && PYTHONPATH=.. python -m pytest path/to/test.py`

### Standalone Node Scripts
When testing standalone TypeScript files in directories without a dedicated `package.json` using the native `node:test` runner, use the `--experimental-strip-types` flag:
```bash
node --experimental-strip-types --test path/to/test.ts
```

*Note: When running tests directly with `node --experimental-strip-types`, imports of TypeScript interfaces or types must strictly use the `import type` syntax (e.g., `import type { MyInterface } from './file.ts'`) and include the `.ts` extension to prevent `ERR_MODULE_NOT_FOUND` runtime errors caused by Node expecting runtime exports for stripped types.*

*Note: When writing native Node tests (`node:test`) for ES modules without a bundler, `__dirname` is undefined. To resolve paths (like local fixtures), use `const __dirname = path.dirname(fileURLToPath(import.meta.url))`.*

## 2. Evaluation Harnesses

Summit provides multiple evaluation harnesses to benchmark components:

- **GraphRAG Hallucination Eval:** `evals/hallucination/` (Uses static JSON fixtures from the canonical knowledge graph schema)
- **GraphRAG Narrative Eval:** `evals/narrative/` (Uses static JSON fixtures to evaluate logical flow without live LLM calls)
- **Multi-Model Comparison:** `evals/model-comparison/` (Compares LLM backends using static JSON fixtures)
- **GraphRAG Performance/Latency Eval:** `evals/performance/` & `evals/latency/` (Uses synthetic data via mock classes to avoid external API calls)

To run AI evaluations locally:
```bash
npx tsx scripts/ai/run_ai_evals.mjs
```

### GraphRAG Evaluations
GraphRAG evaluations must include granular node-level attribution, outputting specific `supporting_nodes`, `contradicting_nodes`, and `fabricated_entities` for each evaluated claim.

### Dataset Fixtures
Dataset fixtures in the Summit Bench benchmark (e.g., under `GOLDEN/datasets/graphrag`) can be validated for structural correctness and ID uniqueness using the `node scripts/ai/validate_fixtures.mjs` script.

## 3. Regression Tests

Regression tests for known bugs and fixed issues belong in the `evals/regression/` directory. These tests must be:
- Deterministic
- Runnable standalone
- Explicitly labeled with the issue or commit reference they cover

## 4. Test Coverage

Code coverage in the monorepo is enforced per-package (via `package.json`, `.coveragerc`, or `jest.config.js`). Coverage threshold calculations explicitly exclude test files to prevent them from causing threshold failures.

*Note: Jest implicit config resolution does not allow multiple configuration files (e.g., `jest.config.ts` and `jest.config.cjs`) in the same directory. Ensure only one is present to prevent test suite failures.*

## 5. Golden Path / Smoke Tests

We protect the core workflow: **Investigation → Entities → Relationships → Copilot → Results**.

The Golden Path integration test checks the end-to-end functionality. Before submitting a PR, ensure the Golden Path passes:
```bash
make smoke
```
