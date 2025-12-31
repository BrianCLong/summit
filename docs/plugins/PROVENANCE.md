# Plugin Provenance & Audit

All plugin activities must be auditable to ensuring compliance and trust.

## Provenance Receipts

Every plugin execution generates a "Receipt" containing:

*   **Traceability**:
    *   `correlationId`: Unique ID for the request chain.
    *   `pluginId` & `version`: Exact code version executed.
    *   `actorId`: User or Service triggering the execution.
*   **Inputs/Outputs**:
    *   Parameters passed to the plugin (sanitized).
    *   Result returned by the plugin (sanitized).
*   **Governance**:
    *   Policy IDs evaluated.
    *   Verdict (ALLOW/DENY).
*   **Cost**:
    *   Execution time (ms).
    *   Memory usage (MB).
    *   Tokens consumed (if applicable).

## Audit Schema

Stored in `plugin_audit_log` table.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Unique record ID. |
| `plugin_id` | String | Plugin Identifier. |
| `tenant_id` | String | Tenant Context. |
| `action` | String | Action Name. |
| `actor_id` | String | Principal ID. |
| `timestamp` | ISO8601 | Time of execution. |
| `duration_ms` | Integer | Execution duration. |
| `status` | String | SUCCESS, FAILURE, DENIED. |
| `receipt` | JSONB | Full provenance receipt (see above). |

## Audit Queries

Admins can query:

*   "Show all actions by plugin X in the last 24h"
*   "Show all policy denials for plugins in Tenant Y"
*   "Identify the most expensive plugin by execution time"
