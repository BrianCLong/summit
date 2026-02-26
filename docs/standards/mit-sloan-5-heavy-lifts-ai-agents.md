# MIT Sloan 5 Heavy Lifts: AI Agent Deployment Standards

This standard defines the requirements for deploying AI agents in the Summit ecosystem.

## 1. Scoping (CLAIM-02)
- Must provide an `agent_scope.yaml` with explicit inputs, outputs, and boundaries.
- Task decomposition must be documented.

## 2. Workflow Integration (CLAIM-03)
- Must provide a `workflow_map.json` mapping upstream and downstream systems.
- Handoff points and human intervention nodes must be explicit.

## 3. Governance (CLAIM-04)
- Must align with `agent_governance_policy.yaml`.
- Deny-by-default is the standard for new agent capabilities.

## 4. Human Oversight (CLAIM-05)
- Must provide a `human_control_matrix.yaml`.
- Escalation paths and override triggers must be defined.

## 5. Metrics (CLAIM-06)
- Must produce `deployment_metrics.json` for deterministic readiness scoring.
- Target readiness threshold is **20/25** for production merge.
