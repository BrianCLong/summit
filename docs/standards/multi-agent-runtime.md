# Multi-Agent Runtime Standards

## Import/Export Matrix
- Local operator input -> controller
- Controller -> planner
- Planner -> executor-specific task envelopes
- Executor -> per-task result envelopes
- Aggregator -> report.json, metrics.json, stamp.json

## Non-goals
- Not a general-purpose workflow engine
- Not a replacement for Summit's full agent orchestration layer
- Not a repo-wide autonomous write system
- Not a human-approval bypass

## Standards
- JSON schema for artifacts
- Deterministic sorting and stable IDs
- Feature flags for burst mode
- Policy-driven write access
- Trace/evidence ID on every task result
