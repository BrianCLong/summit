# Graph Retrieval for Code Generation (GRACG-inspired)

## Objectives

Provide repository-level context to agents so generated code respects cross-file dependencies, improves correctness, and remains observable through metrics and evaluation harnesses.

## Repository Graph

- **Scope**: File imports (TS/JS/Python/Rust), symbol references (exports/imports, class/function use), module dependencies, and optionally test-to-source links.
- **Builder**: CLI/worker that scans repo and emits a graph artifact (`artifacts/graph/context-graph.jsonl` or similar) with nodes (files/symbols) and edges (imports/references/tests). Supports incremental refresh using file mtimes.
- **Storage**: Cached in workspace with hash of repo revision; ledger records graph hash per retrieval request.
- **Schema (MVP)**: `{ "node_id": "file://src/foo.ts", "type": "file|symbol|test", "edges": [{"to": "file://src/bar.ts", "type": "imports"}], "metadata": {"loc": 120, "lang": "ts"} }`.

## Retrieval API

- **Input**: task description, target files (optional), role, constraints (cost/latency budget).
- **Algorithm (MVP)**:
  1. Resolve target nodes (files/symbols) based on task or seed files.
  2. Traverse outward via dependency edges (imports/references/tests) with depth limits and heuristics (prefer recently modified, high centrality nodes).
  3. Rank context candidates by composite score: relevance (text match to task), structural proximity (graph distance), recency, and risk flags (security-sensitive files get higher scrutiny).
  4. Assemble **Context Pack**: ordered list of file snippets, summaries, and diffs with provenance metadata (node ids, hashes, reasons for inclusion).
  5. Emit retrieval artifact validated against `schemas/agent/context-pack.schema.json` and log to ledger.
- **Fallback**: If graph incomplete/outdated, degrade to file-level heuristics (recent files + glob matches) and mark `fallback=true` in retrieval artifact.
- **Interfaces**: Library call + CLI (`bin/context-pack <task> --files a.ts b.ts --budget 2s`).

## Evaluation

- **Context relevance**: Precision/recall on labeled tasks; percentage of retrieved files that match expected dependency set.
- **Cross-file correctness**: Measure whether generated patches compile/tests pass for tasks requiring multiple files.
- **Fallback rate**: % of requests using fallback; target reduction over time.
- **Latency/cost**: Time to build graph and serve retrieval; cost per retrieval if LLM summarization used.
- **Artifacts**: Harness outputs JSON metrics (`artifacts/context-metrics/{run_id}.json`) and attaches to ledger.

## Observability & Governance

- Log graph version/hash with each retrieval in ARL.
- Redact sensitive file contents in context pack when policy dictates; include placeholder plus hash.
- Policy gate: require human approval before exposing files labeled `security-sensitive` to generation prompts.
- Metrics hooks for retrieval latency, fallback triggers, and relevance scores.

## Integration Points

- Agent Planner uses retrieval API to request context pack before code generation.
- IDE/tooling surfaces context pack summary to human reviewers.
- Critic can compare generated code against context pack to flag missing dependencies.

## Acceptance Tests

- Unit: parser correctly extracts imports/symbol refs for fixture files; graph builder outputs expected nodes/edges.
- Integration: retrieval for a multi-file task returns at least one cross-file dependency and marks provenance.
- Fallback: when graph missing entries, retrieval still returns context with `fallback=true` flag set.
