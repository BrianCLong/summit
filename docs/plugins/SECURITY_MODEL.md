# Plugin Security Model

## Core Principles

1.  **Least Privilege**: Plugins explicitly declare capabilities. Anything not declared is denied.
2.  **Sandboxing**: Plugins run in an isolated environment (e.g., V8 isolate or restricted Node.js context) with no access to the host FS or environment variables.
3.  **Fail-Closed**: If a policy decision cannot be made or an error occurs, the action is blocked.

## Policy Enforcement

Every plugin action is evaluated against the Open Policy Agent (OPA) policies.

**Evaluation Flow:**

1.  **Request**: `PluginManager.execute(pluginId, action, ...)`
2.  **Interceptor**: Captures request context (Principal, Tenant, Plugin ID).
3.  **Policy Check**:
    *   Is the plugin enabled for this tenant?
    *   Does the plugin have the required capability for this action?
    *   Does the tenant's policy allow this plugin to execute this action?
4.  **Resource Check**:
    *   Is the tenant within quota?
    *   Is the plugin within its rate limits?
5.  **Execution**: Run in sandbox.
6.  **Audit**: Log result and provenance.

## Sandboxing

We use a layered sandbox approach:

1.  **Language Level**:
    *   `eval()`, `Function()`, and `require()` are disabled.
    *   Globals like `process`, `console` (except proxied), and `global` are scrubbed.

2.  **API Level**:
    *   Network access is provided via a proxied `fetch` client.
    *   File access is strictly prohibited (or virtualized to a temporary scratchpad if needed).

3.  **Network Isolation**:
    *   Outbound traffic is blocked by default.
    *   Allowed domains must be whitelisted in `manifest.resources.network.domains`.

## Data Privacy

*   **Tenant Isolation**: Plugins operating in a tenant context cannot access data from other tenants.
*   **PII Redaction**: Inputs to plugins pass through the PII Redaction layer if flagged.
