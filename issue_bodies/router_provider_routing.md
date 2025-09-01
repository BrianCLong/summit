### Context
Source: `Autonomous Build Operator — Full Roadmap & Tuning Guide`, `SUMMIT_MAESTRO_DELIVERY_PLAN.md`
Excerpt/why: The system needs to intelligently route requests to different providers (e.g., LLMs, code generators) based on cost, capabilities, and availability. A simple, hardcoded approach is not scalable or cost-effective.

### Problem / Goal
The orchestrator lacks a dynamic routing mechanism to select the best provider for a given task. This can lead to high costs, low performance, and lack of resilience to provider outages. The goal is to implement a router that can select providers based on configurable rules, track budgets, and handle fallbacks.

### Proposed Approach
- Implement a central router component that is called before a task is dispatched to a worker.
- Define a YAML configuration for routing rules. Rules can be based on task type, priority, or other metadata.
- Each rule will specify a primary provider and one or more fallback providers.
- The router will integrate with a budgeter component to track spending per provider/project.
- If the primary provider fails or is over budget, the router will attempt to use the fallback provider.
- Implement a simple caching mechanism (e.g., Redis) to store provider responses for repeatable tasks.

### Tasks
- [ ] Design the YAML schema for routing rules.
- [ ] Implement the router component and integrate it into the task dispatch flow.
- [ ] Implement the budgeter component and the logic for tracking costs.
- [ ] Implement the fallback logic for provider failures.
- [ ] Implement the caching layer for provider responses.
- [ ] Add E2E tests for routing, fallbacks, and caching.

### Acceptance Criteria
- Given a task that matches a routing rule, when the primary provider fails, then the task is automatically re-routed to the fallback provider.
- Given a routing rule with a budget, when the budget is exceeded, then subsequent tasks are rejected or re-routed.
- Metrics/SLO: Routing decision latency p99 < 50ms; cache hit rate > 50% for eligible tasks.
- Tests: Unit tests for the router and budgeter; E2E tests for fallback scenarios and caching.
- Observability: Metrics for provider usage, costs, and cache hit/miss rates; a dashboard to visualize routing decisions.

### Safety & Policy
- Action class: READ (routing decisions are read-only)
- OPA rule(s) evaluated: N/A

### Dependencies
- Depends on: #<id_of_durable_store_issue>
- Blocks: Any worker that communicates with an external provider.

### DOR / DOD
- DOR: Routing rule schema and budget tracking design approved.
- DOD: Merged, E2E tests passing, runbook updated with instructions on how to configure routing.

### Links
- Code: `<path/to/orchestrator/router>`
- Docs: `<link/to/routing/configuration>`
