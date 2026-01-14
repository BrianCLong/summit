# Prompt: Things3 TaskStore Connector (MCP)

## Objective

Build a Summit-grade connector that integrates a Things 3 MCP server into a stable TaskStore API with policy gating, evidence logging, idempotency, and contract tests.

## Requirements

- Discover MCP tools at runtime and bind to stable methods: `searchTasks`, `createTask`, `updateTask`.
- Provide clear failure guidance if tools cannot be discovered.
- Enforce policy gating: allowlists, write enablement, tag/project restrictions, rate limits, and explicit move acknowledgements.
- Capture evidence records (redacted args, response summaries, deterministic request hashes) under `artifacts/evidence/`.
- Implement idempotent create using deterministic markers stored in task notes.
- Include unit tests, contract tests with mocked MCP server, and write-disabled policy tests.
- Add docs for configuration, safety model, and example flows.

## Constraints

- No heavy dependencies.
- No secrets in logs.
- Dry-run capable with write operations disabled by default.
