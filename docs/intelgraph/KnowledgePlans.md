# Compiled Knowledge Plans (CKP)

CKPs are reusable, declarative plans for executing complex graph traversals and reasoning tasks.

## Structure

A `KnowledgePlan` consists of a sequence of `PlanStep`s.
*   `query`: Execute a Cypher query (or DSL) to fetch data.
*   `filter`: Apply logic to narrow down results.
*   `risk_check`: Heuristic analysis of data.
*   `summarize`: (Optional) Call an LLM to generate a summary.

## Execution

The `CKPEngine` executes steps sequentially, passing the context (results of previous steps) to the next.

## Built-in Plans

1.  **Dependency Blast Radius**: Finds all assets dependent on a target asset up to N hops and assesses risk.
2.  **Agent Performance Review** (Planned): Analyzes tasks performed by an agent.
