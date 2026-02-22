# Context Shell (Summit)

## Purpose

Context Shell is Summit's policy-gated, evidence-grade filesystem tool surface for agents. It exposes
three minimal tools (`ctx.bash`, `ctx.readFile`, `ctx.writeFile`) with deterministic outputs and
structured evidence logging.

## Enable in Local Dev

1. Ensure the repo is available on disk (Context Shell does not fetch remote sources).
2. Use the Maestro tool registry entry:
   - `ctx.bash`
   - `ctx.readFile`
   - `ctx.writeFile`

Example (Maestro workflow step):

```yaml
steps:
  - id: audit-release-gates
    tool: ctx.bash
    params:
      command: "rg 'policy' docs/release"
```

## Run in CI

Context Shell is deterministic by default. Set an explicit root path and keep the filesystem
read-only unless a governed exception is approved.

```yaml
steps:
  - id: repo-audit
    tool: ctx.bash
    params:
      root: "/workspace/summit"
      fsMode: "readonly"
      command: "rg 'policy' docs/release"
```

## Evidence Outputs

Every tool call writes JSONL evidence events to:

```
./evidence/context-shell/context-shell-events.jsonl
```

Each event includes the normalized command, hashes of inputs/outputs, policy decision IDs,
paths read/written, and redactions applied.

## Threat Model + Limits

- **No arbitrary binaries**: commands are interpreted in-process with a fixed allowlist.
- **Path guardrails**: `.env`, `.git`, `node_modules`, and secret/key paths are denied by default.
- **Time/size limits**: output size, execution time, and file enumeration are capped.
- **Write gating**: `ctx.writeFile` requires justification and patch format.
- **Redaction hooks**: sensitive content can be masked before outputs are returned.

## Supported Commands (Initial)

- `pwd`
- `ls` (`-a`, `-l`)
- `cat`
- `rg` (`-n`)
- `find`
- `wc` (`-l`)

If a command or flag is not allowlisted, the policy layer blocks it.
