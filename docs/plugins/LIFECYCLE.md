# Plugin Lifecycle

This document describes the lifecycle states and transitions for a Summit plugin.

## Lifecycle States

1.  **Registered**: Plugin metadata is known to the system, but code is not yet loaded/verified.
2.  **Installed**: Plugin code is loaded, verified (signature check), and ready for enablement.
3.  **Enabled**: Plugin is active for a specific tenant and responding to events/actions.
4.  **Disabled**: Plugin is installed but inactive for a tenant.
5.  **Error**: Plugin encountered a critical failure and is halted.
6.  **Deprecated**: Plugin is marked for removal; no new installations allowed.

## State Transitions

```mermaid
graph TD
    Registered -->|Install| Installed
    Installed -->|Enable (Tenant)| Enabled
    Enabled -->|Disable (Tenant)| Disabled
    Disabled -->|Enable (Tenant)| Enabled
    Installed -->|Uninstall| Registered
    Enabled -->|Runtime Error| Error
    Installed -->|Deprecate| Deprecated
```

## Hooks

### `initialize(context)`

*   **When**: Called when the plugin instance is created/loaded into memory.
*   **Purpose**: Setup internal state, validate configuration, pre-compute values.
*   **Constraints**: Must complete within 5 seconds. No side effects (network/db) allowed.

### `execute(action, params, context)`

*   **When**: Explicitly invoked by a user or workflow.
*   **Purpose**: Perform a task and return a result.
*   **Constraints**: Subject to `timeout` and memory limits.

### `onEvent(event, payload, context)`

*   **When**: A subscribed platform event occurs (e.g., `entity:created`).
*   **Purpose**: React to system changes.
*   **Constraints**: Must return quickly; use background jobs for heavy lifting.

### `cleanup(context)`

*   **When**: Plugin is disabled or unloaded.
*   **Purpose**: Release resources, close connections.
