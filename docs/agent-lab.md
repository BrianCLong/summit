# Agent Lab

Agent Lab is a defensive, lab-only orchestration layer inspired by policy-gated tool buses. It provides:

- A deny-by-default policy engine with allowlists for tools, targets, and commands
- A workflow runner that loads YAML/JSON specs and executes steps through the ToolBus
- Evidence bundles with provenance, redaction metadata, and deterministic filenames
- A trajectory judge that scores compliance, evidence completeness, and objective coverage

## Safety Model

- **Lab-only by default**: Runs start in dry-run mode. Real execution requires `--lab` and must pass allowlists.
- **Deny by default**: Tools, targets, and commands are blocked unless explicitly allowlisted.
- **Prompt-injection hardening**: All tool output is treated as untrusted, redacted for secrets, and truncated with hashes.
- **No offensive tooling**: Built-in tools are limited to DNS lookups, HTTP header fetches, and safe local grep.

## Running the CLI

```
pnpm --filter @intelgraph/agent-lab test
pnpm agent-lab run --workflow examples/agent-lab/workflows/evidence-only-smoke.yaml --dry-run
pnpm agent-lab run --workflow examples/agent-lab/workflows/asset-metadata.yaml --targets examples/agent-lab/targets.txt --lab
pnpm agent-lab judge --run <runId>
```

CLI commands:
- `agent-lab run --workflow <path> [--targets <file|csv>] [--lab] [--dry-run]` to execute a workflow
- `agent-lab judge --run <runId>` to rescore a completed run
- `agent-lab tools list` to view built-ins
- `agent-lab workflows validate <path>` to validate a spec

## Workflow Specs

Workflows live under `examples/agent-lab/workflows/` and follow the JSON Schema enforced by `WorkflowSpecSchema` (see `packages/agent-lab/src/workflow.schema.json`). Each step defines a tool and inputs; targets can be templated using `{{target}}`.

## Evidence Bundles

Evidence is written under `artifacts/agent-lab/runs/<runId>/`:
- `run.json`: run summary
- `evidence/evidence.ndjson`: append-only artifacts with hashes and policy decisions
- `raw/`: raw tool outputs
- `report.md`: human-readable report
- `judge.json` and `judge.md`: trajectory scoring

## Extending

- Add new tools by implementing `ToolDefinition` in `packages/agent-lab/src/tools.ts` and registering via `createDefaultBus`.
- Add alternative policy engines by implementing `PolicyEngine` and passing it to the ToolBus.
- IntelGraph adapters can consume `run.json` and `judge.json` for graph updates in a future integration.
