# Summit MCP Server Template

This is a "Golden Path" scaffold for building Summit-grade MCP servers. It enforces best practices such as flat typed arguments, outcome-oriented design, and standard response envelopes.

## Features

- **Zod-based Tool Registration**: Automatically converts Zod schemas to JSON Schema for MCP.
- **Flat Argument Enforcement**: Encourages the use of primitive types.
- **Standard Envelopes**: Built-in support for pagination and `_summit_meta` metadata.
- **Actionable Errors**: Helper for returning corrective guidance to the agent.
- **Telemetry**: Automatic logging of tool usage, latency, and payload sizes.
- **Governance**: Built-in hooks for policy evaluation (e.g., blocking `destructive` tools in safe mode).

## Getting Started

1. Copy this package to a new directory in `intelgraph-mcp/packages/`.
2. Update `package.json` with your server name.
3. Implement your tools in `src/index.ts`.
4. Run `pnpm build` to compile.

## Example Tool Definition

```typescript
server.tool(
  "service_action_resource",
  "Clear description of when to use this tool.",
  {
    param1: z.string().describe("What this param does"),
    limit: z.number().default(10)
  },
  async ({ param1, limit }) => {
    // Implementation
    return {
      data: [...],
      pagination: { has_more: false },
      _summit_meta: { size_estimate: "1KB" }
    };
  }
);
```
