# CI/CD Integration for MCP Agents

## Overview
To ensure reliability and security, all MCP-based agents must be tested in the Continuous Integration (CI) pipeline. This document defines the standard for "Agent Integration Testing".

## The Challenge
Agents usually connect to live tools (GitHub, Linear, Production Databases). In CI, we cannot allow random agents to mutate production state.

## The Solution: Mock MCP Servers
During CI execution, the **MCP Host** is configured to connect to **Mock Servers** instead of real external providers.

| Real Server | Mock Server | Behavior |
| :--- | :--- | :--- |
| `github` | `mock-github` | Returns fixtures for `get_pr`; `create_comment` writes to stdout. |
| `linear` | `mock-linear` | Returns static issue lists. |
| `summit-internal` | `summit-stub` | Accepts evidence signatures without writing to the ledger. |

## Workflow Steps

1.  **Template Validation**: Ensure `agents/templates/*.yaml` matches the schema.
2.  **Context Hydration**: The CI runner injects a "Synthetic Context" (e.g., a fake PR diff).
3.  **Dry Run**: The agent is invoked with `DRY_RUN=true`. It generates tool calls but does not execute them (unless safe).
4.  **Assertion**: The CI script verifies that the agent *would have* called the expected tools (e.g., "Did it call `flag_violation` given this bad diff?").

## Evidence Generation
Successful agent runs in CI produce an **Agent Attestation**:
```json
{
  "agent_id": "governance-enforcer",
  "trigger": "pr_123",
  "result": "pass",
  "mocked_tools": ["github", "linear"],
  "timestamp": "..."
}
```
This attestation is bundled into the final release evidence.
