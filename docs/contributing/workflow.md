# Contribution Workflow & Architecture Guidelines

Summit is built on an enterprise-grade agentic architecture involving multi-tenant PostgreSQL, Auth0 JWT authentication, and Stripe Connect. This document explains how to add new graph entities, new query patterns, and provides debugging tips for common issues.

## 1. Adding New Graph Entity Types

Summit's core architecture uses a unified graph structure. The canonical schema for Summit architecture nodes, edges, and provenance fields is located at `docs/architecture/summit-graph.schema.json`.

**Steps to add a new entity type:**
1. **Define the Schema:** Update the JSON schema (`summit-graph.schema.json`) with the new node or edge type. Include all required provenance fields.
2. **Database Migration:** Create a database migration for the multi-tenant PostgreSQL schema (`pnpm run db:migrate:make` or `python manage.py makemigrations` in the `summit/` directory).
3. **Backend Service:** Update the Python backend models to map the new schema entity to the database tables. Include support for Redis caching.
4. **Adapter Utilities:** If external agent ecosystems need to emit this new entity, update the shared adapter utilities (`adapters/conversion.ts`) to map external artifacts into the Summit protocol format.
5. **Evaluation:** Ensure you update benchmark datasets (e.g., `GOLDEN/datasets/`) and expected outputs (`evals/fixtures/`) so that the hallucination and narrative evaluation harnesses account for the new entity type without triggering factual inconsistency alerts.

## 2. Adding New Query Patterns

Summit's intelligence capabilities rely on predefined, robust query patterns to explore the knowledge graph.

**Steps to add a new query pattern:**
1. **Design:** Define the input parameters, expected outputs, and how it navigates the graph structure.
2. **Implementation:** Update the backend query engine within `summit/`.
3. **Mocking for Latency Tests:** Performance and latency benchmarks for Summit's GraphRAG are located in `evals/performance/` and `evals/latency/`. They use synthetic data via mock classes (like `MockGraphRAG` and `MockQueryEngine`). You must implement mock equivalents of your new query to avoid external API calls during testing.
4. **Attribution:** All new queries that use LLM backends must output granular node-level attribution: `supporting_nodes`, `contradicting_nodes`, and `fabricated_entities` for each claim. Update evaluations (`evals/hallucination/`) to enforce this.

## 3. External Agent Ecosystem Adapters

External agent ecosystem adapters (e.g., LangGraph, OpenAI Agents, AutoGen, CrewAI) are located in `./adapters/`. They must implement the `SummitAgentAdapter` interface defined in `./sdk/agent-adapter.ts` to emit Summit protocol artifacts. When contributing an adapter:
1. Ensure artifacts conform to `summit-graph.schema.json`.
2. Provide shared utility conversions in `adapters/conversion.ts`.
3. Add adapter-specific unit tests (e.g., Vitest in `adapters/`).

## 4. Debugging Tips for Common Issues

### Issue: "Port already in use"
**Solution:** Find and kill running processes holding the port. Example: `kill $(lsof -t -i :3000)`.

### Issue: "ERR_MODULE_NOT_FOUND" during tests
**Solution:** When running standalone Node tests (`node --experimental-strip-types`), imports of TypeScript interfaces or types must strictly use the `import type` syntax (`import type { MyInterface } from './file.ts'`) to prevent Node from expecting runtime exports.

### Issue: Test Suite Failures (Jest)
**Solution:** Ensure only one Jest configuration file exists (e.g., `jest.config.ts` or `jest.config.cjs`). Multiple files in the same directory cause implicit config resolution errors.

### Issue: Node Path Errors
**Solution:** When using `__dirname` in native Node tests (`node:test`) for ES modules without a bundler, ensure you resolve paths correctly using:
```javascript
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

### Issue: Coverage Threshold Failures
**Solution:** Check if test files are mistakenly included in the code coverage calculation. Threshold calculations must explicitly exclude test files.

### Issue: Python Imports Missing
**Solution:** When running tests or tools inside `summit/`, ensure your `PYTHONPATH` is set correctly: `cd summit && PYTHONPATH=.. python -m pytest path/to/test`.

### Issue: CI Pipeline Failures due to YAML Scripts
**Solution:** When writing bash scripts that parse YAML in the CI environment, use the `yq` CLI tool (Python wrapper over jq) rather than embedding Python scripts with `import yaml`, as the `yaml` module is not installed by default. Use jq-like syntax (e.g., `yq . file.yaml`).

### Issue: `node:test` without `package.json`
**Solution:** Use the `--experimental-strip-types` flag when running tests in directories without a dedicated `package.json`.
