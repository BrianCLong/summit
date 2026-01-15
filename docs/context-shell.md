# Context Shell (Summit)

## Overview

The Context Shell provides a policy-gated, evidence-logged interface for
repository-scale context discovery without executing arbitrary binaries.
It exposes three tools:

- `ctx.bash(command)`
- `ctx.readFile(path)`
- `ctx.writeFile(path, content, { justification, format })`

Each tool returns structured JSON:

```json
{
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0,
  "filesRead": ["..."],
  "filesWritten": ["..."],
  "durationMs": 12,
  "redactionsApplied": ["..."]
}
```

## Local Development Enablement

1. Ensure the repository is installed with `pnpm install`.
2. The Context Shell is registered by default in the Maestro `WorkflowEngine`.
3. Use the tools in Maestro workflows via `ctx.bash`, `ctx.readFile`, and
   `ctx.writeFile` with a justification and patch format for writes.

Example invocation:

```ts
await ctx.bash('rg "policy" docs/');
```

## CI Enablement

- CI runs should pin the repository SHA passed to Context Shell.
- Evidence logs are written to `evidence/context-shell/` by default.
- For CI, set `GIT_SHA` so evidence records bind to the commit.

## Threat Model + Limits

- **No arbitrary binaries**: commands execute in a minimal TypeScript interpreter.
- **Policy gating**: allowlisted commands/flags and path denylist rules block
  unsafe access (e.g., `.env`, secrets directories).
- **Write controls**: writes require a justification string and patch format.
- **Output redaction**: sensitive tokens are redacted before returning results.
- **Hard limits**: output size, execution time, and step budgets prevent abuse.

## Supported Bash-like Commands

- `pwd`
- `ls [-a|-l] [path]`
- `cat <path>`
- `rg [-n|--line-number] <pattern> [path]`

## Evidence Logging

Each tool call emits `tool_call_start` and `tool_call_end` JSONL entries with
input/output hashes, file read/write paths, policy decision IDs, redaction
markers, and limit metadata for evidence bundles.
