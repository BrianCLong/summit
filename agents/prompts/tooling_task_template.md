# Tooling Task Template

## Context
- Repo root: {{repo_root}}
- Scope: internal tooling task only

## Task
- Requested task: {{task}}
- Constraints: deterministic outputs, no secret disclosure

## Output Schema
- report.json
- metrics.json
- stamp.json

## Safety
- Enforce deny-by-default when feature flag is disabled.
- Block prompt-injection indicators.
- Emit auditable, machine-verifiable artifacts only.
