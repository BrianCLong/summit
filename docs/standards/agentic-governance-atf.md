# Agentic Trust Framework (ATF) Governance

Summit implements the Cloud Security Alliance's Agentic Trust Framework (ATF) to govern agent autonomy.

## Maturity Levels

Agents operate under one of four maturity levels:

1.  **Intern**:
    - **Autonomy**: None.
    - **Actions**: Can propose actions, but cannot execute them.
    - **Capabilities**: Read-only access to approved datasets.
    - **Requires**: 100% human approval.

2.  **Junior**:
    - **Autonomy**: Limited.
    - **Actions**: Can execute low-risk actions.
    - **Capabilities**: Restricted toolset.
    - **Requires**: Human approval for high-risk actions.
    - **Promotion Criteria**: >95% recommendation acceptance rate, >30 days at level.

3.  **Senior**:
    - **Autonomy**: High.
    - **Actions**: Can execute most actions.
    - **Capabilities**: Full toolset access (subject to policy).
    - **Requires**: Policy checks, audit logging.

4.  **Principal**:
    - **Autonomy**: Full.
    - **Actions**: Can execute all actions including sensitive ones.
    - **Capabilities**: Full access.
    - **Requires**: Continuous monitoring.

## Promotion Protocol

Agents earn autonomy through demonstrated performance.

### Criteria

| Level | Min Success Rate | Min Tasks | Min Days | Other |
| :--- | :--- | :--- | :--- | :--- |
| Intern | 80% | 10 | 7 | - |
| Junior | 90% | 50 | 30 | >95% Acceptance |
| Senior | 95% | 200 | 90 | - |

## Implementation

The governance model is enforced via the `GovernanceManifest` attached to each agent identity. The `AgentOrchestrator` checks capabilities before execution.
