# Decision Guide: Agents vs APIs

| Use Case             | Choose Agents When                                                   | Choose APIs When                                |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| Exploratory analysis | You need reasoning, chaining, or context synthesis with provenance   | A deterministic query or fetch is sufficient    |
| Policy posture       | Policies must be evaluated at each step with context-aware decisions | A static allowlist/denylist is enough           |
| Cost control         | Token usage varies by prompt and requires per-run caps               | Costs are predictable and metered per request   |
| Governance           | You need full lineage, prompts, and intermediate results captured    | Only final results and access logs are required |

**Default**: Prefer APIs for simple CRUD or lookups; use agents when reasoning or orchestration is required and policies must be applied mid-flow.
