# Dependency Graph & Blast Radius Analyzer

These tools generate a directed dependency graph across Summit/IntelGraph services and simulate the blast radius of a service failure.

## Generators

- `scripts/analyze-dependencies.ts`
  - Inputs: Docker Compose definitions, service env files, code imports, CI workflows, and LLM pipeline configs.
  - Outputs: `dependency-graph.json`, `dependency-graph.dot`, `dependency-graph.png`, and `dependency-risk-table.md` in `docs/architecture/`.
- `scripts/blast-radius.ts`
  - Inputs: dependency graph derived from the repository.
  - Outputs: `blast-radius.png` and `blast-radius-report.txt` summarizing degraded services.

## Usage

```bash
node --loader ts-node/esm scripts/analyze-dependencies.ts
node --loader ts-node/esm scripts/blast-radius.ts <service>
```

Artifacts live in `docs/architecture/` for documentation and CI guardrails.
