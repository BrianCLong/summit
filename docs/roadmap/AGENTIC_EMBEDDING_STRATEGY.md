# Agentic Embedding Strategy: The "Copilot SDK" Pivot

**Owner:** Jules
**Date:** 2026-01-27
**Status:** STRATEGIC DIRECTION

## The Signal

GitHub's release of the Copilot SDK demonstrates that **agentic runtimes must be embeddable**, not just standalone services. We must pivot `maestro-core` from a backend orchestrator to a portable SDK.

## The Strategy

We will refactor `packages/maestro-core` into `@summit/agent-runtime`, a library that can be imported into:
1.  **Summit Web App:** For in-browser agent capabilities.
2.  **External Integrations:** Embedding Summit intelligence into partner tools.
3.  **Edge Workers:** Running lightweight agents on Vercel/Cloudflare.

## Architecture: The "Runtime Loop"

The SDK will expose the core "OODA Loop" as a primitive:

```typescript
import { AgentRuntime } from '@summit/agent-runtime';

const agent = new AgentRuntime({
  policy: 'strict-compliance-v1',
  tools: [/* MCP Tools */]
});

// The loop is now programmable
agent.on('plan', (step) => {
  console.log(`Planning: ${step}`);
});

await agent.execute("Analyze this threat");
```

## Roadmap

1.  **Q1 2026:** Decouple `maestro-core` from Node.js specifics (e.g., `fs`, `child_process`).
2.  **Q2 2026:** Publish `@summit/agent-runtime` (Private Beta).
3.  **Q3 2026:** Release "Summit Copilot" for VS Code using the SDK.
