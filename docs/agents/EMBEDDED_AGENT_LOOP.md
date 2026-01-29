# Embedded Agent Loop (Copilot-SDK Integration)

**Status:** Technical Preview
**Owner:** @jules (Release Captain)

## Overview

This document describes the architecture for embedding the **Copilot Agentic Runtime** directly into Summit's services and workflows. By leveraging the `packages/copilot-agent-runtime` library, internal tools can now host autonomous agents that can plan, reason, and execute tasks against the MCP Gateway.

## Architecture

The embedded agent loop consists of three components:

1.  **Agent Runtime (`packages/copilot-agent-runtime`)**: A wrapper around the Copilot SDK that handles initialization, state management, and goal execution.
2.  **MCP Client**: The agent acts as an MCP client, discovering tools and resources via the **MCP Gateway**.
3.  **Host Application**: The service (e.g., CI runner, evidence generator) that instantiates the runtime.

## Workflow

1.  **Goal Injection**: The host app provides a high-level goal (e.g., "Fix the lint errors in file X").
2.  **Planning**: The Agent Runtime (via Copilot SDK) decomposes the goal into a plan.
3.  **Tool Discovery**: The agent queries the MCP Gateway for available tools (`tools/list`).
4.  **Execution**: The agent executes tools via the Gateway (`tools/call`), which enforces policy.
5.  **Feedback Loop**: Results are fed back into the context for re-planning.

## Security

*   **Identity**: The agent operates with a specific `agentId` and `capabilities`.
*   **Sandboxing**: All execution happens within the boundaries defined by the MCP Gateway policy.
*   **Audit**: Every step is logged with a `trace_id`.

## Usage Example

```typescript
import { AgentRuntime } from '@intelgraph/copilot-agent-runtime';

const agent = new AgentRuntime({
  agentId: 'ci-fixer-bot',
  capabilities: ['code_edit', 'lint_check']
});

await agent.initialize();
await agent.runGoal('Fix lint errors in server/src/index.ts');
```
