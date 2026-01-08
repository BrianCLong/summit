# Agent Telemetry & Audit Standards

**Owner:** Observability Team
**Status:** DRAFT

## 1. Overview

To effectively govern autonomous agents, we must have "glass-box" visibility into their operations. This document defines the **standard telemetry schema** required for all agents in Summit.

Metrics are not just for debugging—they are the legal record of consumption and risk.

---

## 2. Standard Metrics Schema

All agents must emit metrics to the central `telemetry-ingest` service.

### A. Economic Metrics (Cost Attribution)

These metrics drive the billing and quota systems.

| Metric Name               | Type    | Tags                                            | Description                             |
| :------------------------ | :------ | :---------------------------------------------- | :-------------------------------------- |
| `agent_tokens_total`      | Counter | `agent_id`, `model`, `type` (prompt/completion) | Volume of tokens processed.             |
| `agent_execution_seconds` | Gauge   | `agent_id`, `status`                            | Duration of active execution.           |
| `agent_api_calls`         | Counter | `agent_id`, `target_service`, `status_code`     | External or internal API requests.      |
| `agent_tool_usage`        | Counter | `agent_id`, `tool_name`                         | Frequency of specific tool invocations. |

### B. Risk & Operational Metrics

These metrics drive the [Risk Scoring](./risk-scoring.md) and enforcement systems.

| Metric Name              | Type    | Tags                      | Description                                           |
| :----------------------- | :------ | :------------------------ | :---------------------------------------------------- |
| `agent_risk_score`       | Gauge   | `agent_id`, `run_id`      | The calculated risk score for the run.                |
| `agent_files_modified`   | Counter | `agent_id`, `directory`   | Volume of file system changes.                        |
| `agent_secrets_accessed` | Counter | `agent_id`, `secret_name` | Audit trail of credential usage.                      |
| `agent_budget_percent`   | Gauge   | `agent_id`, `dimension`   | % of allocated budget consumed (e.g., 85% of tokens). |

---

## 3. Audit Logging (Structured Events)

Beyond aggregate metrics, specific **Audit Events** must be logged to immutable storage (e.g., S3 WORM, Splunk).

**Format:** JSON Structured Log

### Required Event Fields

```json
{
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "actor": {
    "agent_id": "refactor-bot-v1",
    "run_id": "run-12345",
    "tenant_id": "tenant-abc"
  },
  "action": "FILE_WRITE", // or MODEL_CALL, SECRET_ACCESS, SPAWN_CHILD
  "target": "server/src/auth/login.ts",
  "context": {
    "risk_score": 45,
    "budget_remaining": 12000
  },
  "status": "SUCCESS"
}
```

### Retention Policy

- **Operational Logs:** 30 days (Hot storage).
- **Audit Trail (Governance):** 7 years (Cold storage / Archive).
- **Incident Snapshots:** Indefinite (High-risk failures).

---

## 4. Anomaly Detection & Alerts

The observability platform (Prometheus/Grafana) evaluates rules against these metrics.

### Standard Alerts

1.  **Budget Burn Rate High:**
    - _Condition:_ Agent consumes > 50% of budget in < 10% of expected time.
    - _Severity:_ Warning.
2.  **Sudden Fan-Out:**
    - _Condition:_ `agent_children_count` rate of change > 5/minute.
    - _Severity:_ Critical (Potential recursive fork bomb).
3.  **Risk Score Spike:**
    - _Condition:_ `agent_risk_score` > 80 (Critical Threshold).
    - _Severity:_ Critical (Security Operations Pager).

---

## 5. "Why was I stopped?" (Incident Explainer)

When an agent is terminated by the control system, a generated report explains the cause. This is accessible to the developer via the CLI or Console.

**Example Report:**

> **Agent Execution Halted**
>
> - **Run ID:** `run-xyz-789`
> - **Reason:** `BUDGET_EXCEEDED`
> - **Details:**
>   - **Dimension:** Token Usage
>   - **Limit:** 200,000 tokens (Tier-2)
>   - **Consumed:** 200,450 tokens
>   - **Action:** Soft limit warning sent at 160k. Hard limit enforced at 200k.
>
> **Remediation:**
> Optimize your prompt strategy to use fewer tokens, or request a Tier-3 budget override for this task.
