
# Envelope-Constrained Graph Policy Compilation (EC-GPC)

**A method for compiling high-level goals into resource-bounded, graph-structured execution policies.**

## Overview

EC-GPC is a compiler and runtime system that transforms an abstract goal (e.g., "Summarize this document") and a set of hard constraints (e.g., "Max latency 500ms", "No external calls") into a deterministic Policy Graph (DAG).

Each node in the policy graph is assigned a strict resource **envelope** (latency, cost, tokens). The runtime enforces these envelopes and can dynamically redistribute "slack" (unused budget) to subsequent nodes to maximize utility.

## Key Concepts

1.  **Policy Compilation**: The process of selecting a template, predicting costs, and allocating budgets to produce a Policy Graph.
2.  **Resource Envelopes**: Hard limits on time and cost for each step.
3.  **Slack Redistribution**: Runtime mechanism where unused budget from a fast/cheap step is forwarded to the next step's envelope.
4.  **Provenance Gating**: Policy branches can be guarded by trust scores or privacy requirements.

## Architecture

*   **Compiler (`policy-compiler.ts`)**:
    *   Generates candidate graphs.
    *   Predicts metrics based on asset telemetry.
    *   Solves for optimal envelope allocation.
*   **Runtime (`policy-runtime.ts`)**:
    *   Executes the DAG.
    *   Enforces envelopes.
    *   Redistributes slack.
    *   Logs execution trace to IntelGraph.
*   **IntelGraph Integration**:
    *   Every step is logged as an immutable evidence node in the provenance graph.

## API Usage

### Compile a Policy

```http
POST /api/policy/compile
Content-Type: application/json

{
  "goal": {
    "id": "task-1",
    "description": "Analyze sentiment",
    "taskType": "classification"
  },
  "constraints": {
    "maxLatencyMs": 500,
    "maxCostUsd": 0.01
  }
}
```

### Execute a Policy

```http
POST /api/policy/execute
Content-Type: application/json

{
  "policy": { ... policy object returned from compile ... },
  "input": {
    "text": "The service was excellent."
  }
}
```
