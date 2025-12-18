# Summit-Flow Specification: The Agentic Orchestration Layer

## Vision
"From Static Pipelines to Dynamic Investigations."
Summit-Flow (Epic 2) transforms the Maestro engine from a hardcoded job runner into a user-configurable, directed acyclic graph (DAG) execution engine. This allows analysts to define "Investigation Playbooks" that chain together search, LLM reasoning, and graph analysis steps.

## Core Concepts

### 1. Workflow Definition (JSON Schema)
A Workflow is a reusable template defining a sequence of steps.

```json
{
  "id": "investigation-v1",
  "name": "Standard Corporate Due Diligence",
  "version": "1.0.0",
  "inputs": [
    { "name": "company_name", "type": "string" },
    { "name": "jurisdiction", "type": "string", "optional": true }
  ],
  "steps": [
    {
      "id": "google_search",
      "tool": "search.google",
      "params": {
        "query": "site:linkedin.com/company {{inputs.company_name}}"
      }
    },
    {
      "id": "extract_executives",
      "tool": "llm.extract_entities",
      "params": {
        "text": "{{google_search.output}}",
        "schema": "Person"
      },
      "retries": 2
    },
    {
      "id": "enrich_graph",
      "tool": "graph.create_nodes",
      "params": {
        "nodes": "{{extract_executives.output}}",
        "edge_type": "WORKS_FOR"
      }
    }
  ],
  "outputs": {
    "summary": "{{extract_executives.summary}}",
    "graph_update_count": "{{enrich_graph.count}}"
  }
}
```

### 2. The Tool Registry
A registry of available actions that steps can invoke.
*   `search.google`: Perform a Google search (SERP API).
*   `llm.generate`: Generic LLM prompt.
*   `graph.cypher`: Execute a Cypher query.
*   `utils.http`: Make a raw HTTP request.

### 3. The Execution Engine
*   **State Management:** Tracks the status of each step (PENDING, RUNNING, COMPLETED, FAILED).
*   **Variable Substitution:** Resolves `{{step_id.output}}` using Mustache or simple dot-notation.
*   **Persistence:** Stores the execution trace in the `runs` table (already exists) but with expanded metadata.

## Architecture Changes

### New Components
*   `server/src/maestro/engine/WorkflowEngine.ts`: The core logic class.
*   `server/src/maestro/engine/StepExecutor.ts`: Interface for individual step runners.
*   `server/src/maestro/registry/ToolRegistry.ts`: Singleton mapping strings to function implementations.

### Data Model Updates (Postgres)
Existing `runs` table is sufficient for high-level tracking, but we might need a `run_steps` table for granular progress:
```sql
CREATE TABLE run_steps (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES runs(id),
  step_id VARCHAR(255),
  status VARCHAR(50), -- PENDING, RUNNING, COMPLETED, FAILED
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```
*(For MVP, we can store steps execution in `runs.output_data` or a generic `state` JSON column.)*

## Implementation Plan (Phase 1)
1.  **Scaffold Engine:** Create `WorkflowEngine` class that accepts a JSON definition + Input.
2.  **Implement Basic Tools:** Registry with `echo` and `delay` for testing.
3.  **Variable Resolution:** Implement simple `{{ }}` substitution.
4.  **Integration:** Expose via `POST /api/workflows/execute`.
