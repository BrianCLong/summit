# Cost Guard

## Components
- **Budget engine**: per-workspace monthly budget with rollover options and alert thresholds (85% warn, 100% enforce).
- **Slow-query killer**: monitors query spans; terminates queries exceeding duration or budget, emits audit with rationale and appeal link.
- **Archival tiering**: auto-move cold datasets to cheaper storage; requires manifest update and policy approval.

## Behaviors
- Deny-by-default when budget metadata is missing; users receive human-readable message and appeal path.
- Supports simulation mode that reports projected cost without executing the query.
- Integrates with OPA obligations to enforce redaction or sampling for high-cost datasets.
- Emits OTEL metrics: `cost.guard.blocked`, `cost.guard.killed`, `cost.guard.budget_remaining`.

## Configuration
- Budgets defined in YAML (2-space indent) with workspace, owner, monthly_cap, throttle_limits.
- Thresholds exposed via environment variables for CI and staging; prod uses configuration service with checksum.
- Reports exported weekly to object storage with hash and manifest ID for audit.

## Validation
- k6 load plan targets sustained 100 RPS mixed query traffic while keeping p95 <1.5s and zero uncontrolled cost overruns.
- Unit tests cover budget math and appeal path; integration tests assert kill signals arrive within SLA.
