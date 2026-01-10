# Maestro Job Specification

This document defines the minimal **Maestro** job contract used by the vertical slice CLI (`mc`). Jobs can be authored in JSON or YAML. The CLI validates the spec, evaluates policy, records immutable state transitions, and executes approved steps.

## Top-level fields

| Field               | Type          | Required | Description                                                                                                                           |
| ------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | string        | ✅       | Human-readable job name.                                                                                                              |
| `owner`             | string        | ✅       | Owner or service principal responsible for the job. Enforced by the `owner-present` policy.                                           |
| `environment`       | string        | ✅       | Execution environment tag (`dev`, `staging`, `prod`, etc.). Production requires explicit approval.                                    |
| `trace_id`          | string        | optional | Optional caller-provided trace ID; falls back to a generated UUID v4. Propagated to logs and subprocess environment (`TRACE_ID`).     |
| `required_policies` | array[string] | optional | Policies that must pass before execution. Supported: `owner-present`, `no-destruction`, `prod-requires-approval`, `max-step-timeout`. |
| `inputs`            | object        | optional | Arbitrary input metadata for steps.                                                                                                   |
| `outputs`           | object        | optional | Declared outputs; recorded on completion.                                                                                             |
| `steps`             | array[Step]   | ✅       | Ordered list of steps to run.                                                                                                         |

### Step

| Field             | Type    | Required | Description                                                                                                |
| ----------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `id`              | string  | optional | Step identifier. Defaults to the positional order.                                                         |
| `name`            | string  | ✅       | Display name.                                                                                              |
| `command`         | string  | ✅       | Shell command executed locally.                                                                            |
| `timeout_seconds` | integer | optional | Maximum execution time per attempt (default: 300). The `max-step-timeout` policy caps this at 900 seconds. |
| `retries`         | integer | optional | Number of retries on failure (default: 0).                                                                 |

## Policies

Policies execute before any step runs. A failed policy marks the job as **DENIED** and emits an audit event; no steps execute.

- `owner-present`: Job must set `owner`.
- `no-destruction`: Rejects commands containing destructive patterns (`rm -rf /`, `:(){:|:&};:`). Applies to all steps.
- `prod-requires-approval`: When `environment` is `prod`, the job must set `metadata.prod_approved` to `true`.
- `max-step-timeout`: Each step's `timeout_seconds` cannot exceed 900 seconds.

## State model

Maestro stores immutable state transitions as an append-only list per job.

```
NEW -> SUBMITTED -> VALIDATED -> (DENIED | RUNNING)
RUNNING -> COMPLETED | FAILED
```

- `DENIED` is terminal and indicates policy or validation failure (no steps executed).
- `FAILED` indicates at least one step failed or exceeded retries.
- `COMPLETED` indicates all steps succeeded.

## Trace and audit behavior

- Each job carries a `trace_id` propagated to subprocess environment (`TRACE_ID`) and log lines.
- Every state transition emits a JSON audit record to `var/maestro/audit.log` with timestamp, job ID, trace ID, actor, and reason.
- Step log filenames are derived from the step id and sanitized to prevent path traversal.

## Example (JSON)

```json
{
  "name": "echo-success",
  "owner": "maestro@example.com",
  "environment": "dev",
  "required_policies": ["owner-present", "no-destruction"],
  "steps": [
    {
      "id": "echo",
      "name": "Echo message",
      "command": "echo 'hello from maestro'"
    }
  ]
}
```

## Example (YAML)

```yaml
name: prod-release
owner: release-captain@example.com
environment: prod
required_policies:
  - owner-present
  - prod-requires-approval
metadata:
  prod_approved: true
steps:
  - id: verify
    name: Verify release gate
    command: ./scripts/check-release.sh
    timeout_seconds: 120
```
