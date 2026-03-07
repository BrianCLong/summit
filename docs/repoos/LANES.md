# Lanes

Lanes restrict, route, and limit the cardinality of incoming changes per category of risk, ensuring that low-risk changes don't queue behind high-risk ones.

In Summit RepoOS, every concern is assigned a merge lane in `.github/repoos/lanes.yml`.

## Core Concept

Each lane has defined:

- **`allowed_paths`:** File paths a lane is allowed to touch.
- **`required_checks`:** Which checks must pass in this lane before moving towards `main`.
- **`max_open_prs`:** How many simultaneous PRs can be open per lane.

## Available Lanes

### `lane.fast`

For fast, deterministic changes. Examples: docs, evidence contract, type-only changes, path filters.

### `lane.service-bounded`

For changes isolated to specific services. Examples: server-only, client-only, infra-only.

### `lane.gov-deterministic`

For governance-sensitive changes with deterministic scope. Examples: .github metadata, scripts, docs, tools.

### `lane.heavy`

For complex, cross-service, or heavy-integration efforts that require more stringent validation. Examples: schema migrations, multi-env infra.

## Schema Validation

Lanes must conform to `lane.schema.json`. For instance:

```json
{
  "id": "lane.fast",
  "title": "Fast deterministic",
  "allowed_paths": [
    "docs/**",
    "scripts/**",
    ".github/**"
  ],
  "required_checks": [
    "pr-gate"
  ],
  "max_open_prs": 5
}
```
