# Summit Subagents

## Purpose
Summit subagents are specialized, sandboxed executors designed to offload focused tasks from the
primary orchestrator while keeping the parent session deterministic and policy-compliant. Subagents
run in isolated context windows, return only essential findings, and never spawn additional
subagents. This preserves bounded complexity and prevents recursive delegation.

## Authoring Subagents
Subagent definitions are Markdown files with YAML frontmatter and a freeform body. Place them under
`resources/agents/`.

### Required frontmatter
- `name`: unique agent identifier.
- `description`: short description used for delegation routing.

### Optional frontmatter
- `tools`: explicit allowlist of tool names.
- `disallowedTools`: explicit denylist of tool names.
- `model`: routing hint (e.g., `fast`, `default`, `deep`).
- `skills`: optional capability tags.
- `permissionMode`: optional execution mode hint.

### Example
```markdown
---
name: explore
description: Fast, read-only codebase exploration.
tools: [Read, Grep, Glob]
disallowedTools: [Write, Edit, Bash, Task]
model: fast
---
You are a read-only exploration specialist.
Return only: key findings, file paths, and suggested next delegations.
```

## Tool Policy
Tool access is enforced using deny-by-default policies. If `tools` is present, the subagent may only
call tools in that allowlist. Any tool listed in `disallowedTools` must be rejected. The `Task`
tool is always denied for subagents to prevent recursive delegation.

## Result Capsule Contract
Subagents return a concise capsule to the parent orchestrator. The capsule is limited to essential
information for follow-on decisions.

- `agent_name`
- `summary`
- `findings[]` with `severity`, `file_refs[]`, `evidence_ids[]`
- `patch_suggestions[]` with `paths` and minimal diff or skeleton stubs
- `policy_notes[]` for blocked operations

## Built-in Agents
Summit ships with the following built-ins, implemented as Markdown definitions:

- **explore**: Read-only search and file discovery.
- **plan**: Read-only reasoning and plan drafting.
- **bash**: Shell execution specialist for bounded commands.
- **general**: Broad capability agent, still subject to tool policy enforcement.

## Governance Rules
- **No recursion**: subagents MUST NOT have access to the `Task` tool.
- **Evidence-first**: subagent outputs must reference Evidence IDs and file paths.
- **Determinism**: avoid timestamps in outputs except in `stamp.json` evidence.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, privilege escalation, data exfiltration, recursion.
- **Mitigations**: tool allow/deny lists, Task tool denial, redaction policies, deterministic
  evidence outputs.
