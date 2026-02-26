# Runbook: MIT Sloan 5 Heavy Lifts AI Agent Deployment

This runbook describes the operational procedures for managing AI agents according to the 5 Heavy Lifts framework.

## 1. Incident Severity Mapping
- **Low**: Score drift < 10%.
- **Medium**: Missing `agent_scope.yaml` or `workflow_map.json`.
- **High**: Governance policy bypass or privilege escalation detected.

## 2. Human Escalation Chain
- **Step 1**: Notify Domain DRI.
- **Step 2**: Escalation to Security Council for policy violations.
- **Step 3**: Invoke Kill-Switch via `summitctl` if autonomy is compromised.

## 3. Rollback Procedure
1.  Identify the last stable `readiness_score.json`.
2.  Revert agent capability in `agents/registry.yaml`.
3.  Deploy last known good configuration.
4.  Verify drift detector is green.

## 4. SLA Assumption
99% readiness gate uptime. All new agents must meet the 20/25 threshold before deployment.
