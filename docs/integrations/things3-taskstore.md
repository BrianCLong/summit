# Things3 TaskStore Connector (MCP)

## Readiness Assertion

This connector is aligned to the Summit Readiness Assertion and enforces policy-gated execution, evidence capture, and idempotent task creation from the first call.

## Overview

The Things3 TaskStore connector binds a dynamic MCP server (for Things 3) into a stable internal interface:

- `searchTasks(query, filters)`
- `createTask(taskSpec, idempotencyKey)`
- `updateTask(taskRef, patch, preconditions)`

The connector discovers MCP tools at runtime and will fail fast if search/create/update tools are not discoverable. It never logs secrets and defaults to advisory behavior with write operations disabled.

## Configuration

### MCP server

The upstream Things 3 MCP server is expected to be configured separately (e.g., `qoli/things-3-mcp`). It requires:

- `THINGS_TOKEN` environment variable
- A running MCP server command (example):

```bash
uvx --from things-3-mcp things3-mcp --stdio
```

### Summit connector config

```ts
import { Things3TaskStore } from "@intelgraph/mcp-connectors-things3";

const store = await Things3TaskStore.create(mcpClient, {
  agentId: "copilot:task-orchestrator",
  toolOverrides: {
    search: "things_search",
    create: "things_create",
    update: "things_update",
  },
  policy: {
    allowedOperations: ["search", "create", "update"],
    writeEnabled: false,
    dryRun: true,
    allowedProjects: ["Summit", "Ops"],
    allowedTags: ["p0", "summit"],
    rateLimitPerMinute: 30,
    requireMoveReason: true,
  },
  evidence: {
    enabled: true,
    runId: "ci-2026-01-14",
  },
});
```

### Safety model

- **Write operations are disabled by default.** Set `policy.writeEnabled = true` to allow create/update.
- **Dry-run mode** (`policy.dryRun = true`) simulates create/update without executing the MCP tool.
- **Redaction** removes token/secret-like fields from evidence logs before writing to disk.
- Evidence is written under `artifacts/evidence/evidence-<runId>/things3/`.

## Evidence and replay

Each invocation writes a structured evidence record that includes:

- request hash (deterministic)
- tool name and operation
- redacted arguments
- response summary
- timestamps and duration
- policy outcome and dry-run status

## Idempotency

`createTask` requires an `idempotencyKey`. The connector writes the marker `summit://task/<key>` into the task notes and performs a pre-flight search to return existing tasks instead of creating duplicates.

## Example flows

### Sync top 10 P0 GitHub issues into Things

1. Pull the top 10 P0 issues from GitHub.
2. For each issue, create a deterministic idempotency key (e.g., `github://issue/<id>`).
3. Call `createTask` with title, link, and tags.

```ts
for (const issue of topIssues) {
  await store.createTask(
    {
      title: `[P0] ${issue.title}`,
      notes: issue.url,
      tags: ["p0", "summit"],
      project: "Summit",
    },
    `github://issue/${issue.id}`
  );
}
```

### Daily triage summary

1. Search Things for `summit` tasks.
2. Generate a standup summary with titles and statuses.

```ts
const tasks = await store.searchTasks("summit", { status: "open", limit: 25 });
const summary = tasks.map((task) => `• ${task.title} (${task.status})`).join("\n");
```

## Failure modes

- **Missing tools**: The connector fails fast with guidance to configure `toolOverrides`.
- **Write disabled**: Create/update calls fail with a policy error unless `writeEnabled` is true or dry-run is active.
- **Move without reason**: Updating project/area requires `preconditions.moveReason` to avoid silent bulk moves.

## Constraints

If the MCP server does not expose task metadata fields (notes, tags, project), the connector will degrade gracefully, returning partial normalized results and logging the limitation in evidence records.
