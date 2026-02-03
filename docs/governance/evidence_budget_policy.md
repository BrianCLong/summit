# Evidence Budget Policy

**Status:** Active
**Owner:** AI Governance
**Enforcement:** Automated (CI/Runtime)
**Last Updated:** 2026-01-26

## 1. Purpose

This policy establishes strict limits on the volume and complexity of graph evidence that can be injected into LLM contexts. The goal is to prevent "context flooding," ensure deterministic reasoning, and control computational costs.

## 2. Default Budgets

Unless explicitly overridden by a privileged `AgentManifest` with `HighCompute` authorization, the following default budgets apply to all GraphRAG operations:

| Metric | Default Limit | Hard Ceiling | Rationale |
| :--- | :--- | :--- | :--- |
| **Max Nodes** | 50 | 200 | Prevents context window saturation. |
| **Max Edges** | 100 | 500 | Limits combinatorial path explosion. |
| **Max Hops** | 2 | 4 | Deep traversals degrade reasoning accuracy exponentially. |
| **Max Paths** | 10 | 50 | Focuses on high-confidence reasoning chains. |

## 3. Budget Enforcement

### 3.1 Pre-Execution (Intent Compilation)
The `IntentCompiler` must reject any `IntentSpec` that requests resources exceeding the budget allocated to the calling agent.

### 3.2 Runtime (Cypher Execution)
All generated Cypher queries must include `LIMIT` clauses derived from the Evidence Budget.
Example:
```cypher
MATCH path = (start)-[*..2]->(end)
RETURN path
ORDER BY end.centrality DESC
LIMIT 10  // Enforced by budget
```

### 3.3 Post-Execution (Result Truncation)
If a query returns more results than budgeted (e.g., due to dense subgraphs), the results must be truncated deterministically using the specified `ordering` criteria (e.g., centrality, timestamp). Random sampling is **prohibited**.

## 4. Exceptions

Exceptions to this policy require:
1.  A documented business case in `docs/governance/EXCEPTION_REGISTER.md`.
2.  Approval from the AI Safety Board.
3.  Implementation of specific guardrails to handle the expanded context.
