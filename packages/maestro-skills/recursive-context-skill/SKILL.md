# RecursiveContextSkill

**Purpose:** Answer questions over huge inputs by inspecting a context handle with safe primitives and recursive subcalls.

## Inputs
- `query`: The question or task description.
- `context_handle`: Object pointing to the data source (repo, docBundle).
- `budgets`: Limits on execution (depth, iterations, wall time).
- `policy_profile`: Security policy profile name.

## Outputs
- `answer`: The final result.
- `citations`: List of spans used.
- `trace_artifact`: JSONL trace of execution.
- `metrics`: Usage metrics.
