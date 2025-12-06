# Observability Events

Events track the lifecycle of operations within Summit.

## Core Events

- `flow_started`: Triggered when a flow begins execution.
- `flow_completed`: Triggered when a flow finishes successfully.
- `flow_failed`: Triggered when a flow encounters an error.
- `agent_task_assigned`: Task delegated to a specific agent.
- `agent_task_completed`: Task finished by an agent.
- `governance_check_passed`: Policy validation success.
- `governance_violation`: Policy check failure.
