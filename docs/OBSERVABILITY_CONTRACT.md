# Observability Contract & Schema

## 1. Request Lifecycle

Every request **must** be traceable from ingress to response.

- **Correlation ID**: `x-correlation-id` header (UUID v4).
  - Generated at ingress (LB or API Gateway).
  - Propagated to all downstream services (HTTP headers, queue metadata).
  - Included in all logs via `correlation_id` field.
  - Included in all DB/Ledger entries via `metadata.correlationId`.

- **Trace Context**: W3C Trace Context (`traceparent`) **must** be supported.

## 2. Agent Invocation

Agents are treated as **infrastructure**, not black boxes.

- **Start**: Log `AgentExecutionStarted` with `{ agentId, taskId, tenantId, correlationId }`.
- **Step**: Log `AgentStep` with `{ stepType: "llm" | "tool", toolName?, correlationId }`.
- **End**: Log `AgentExecutionCompleted` with `{ outcome: "success" | "failure", durationMs, correlationId }`.
- **Metrics**:
  - `agent_execution_duration_seconds` (Histogram)
  - `agent_execution_total` (Counter, labels: `agent_id`, `status`)
  - `agent_tool_usage_total` (Counter, labels: `agent_id`, `tool_name`)

## 3. Policy Evaluation

Policy decisions are critical security events.

- **Log**: `PolicyEvaluation` with `{ policyId, decision: "allow" | "deny", tenantId, correlationId, inputsHash }`.
- **Metric**: `policy_decisions_total` (Counter, labels: `policy`, `decision`).

## 4. Signal Integrity (MVP)

All emitted signals (metrics, dashboards, reports) must be labeled.

- **Label**: `signal_type` = `"real" | "simulated" | "synthetic"`.
- **Rule**: Mixed signals must be explicitly aggregated with separate counters or clearly marked.

## 5. Structured Logging Schema (JSON)

All logs must follow this JSON schema:

```json
{
  "level": "info",
  "time": "ISO8601",
  "service": "intelgraph-server",
  "correlationId": "uuid",
  "tenantId": "string",
  "principalId": "string",
  "msg": "Human readable message",
  "event": "EventName", // Optional, for machine parsing
  "attributes": { ... } // Context specific data
}
```
