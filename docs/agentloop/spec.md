# Agent Loop Specification

## Prompt Architecture
The prompt is constructed as an append-only sequence of items.

### Roles
1. `developer`: Sandbox constraints and system instructions.
2. `user`: Project-specific instructions (`AGENTS.md`).
3. `user`: Environment context (`cwd`, `shell`).
4. `assistant`: Model responses.
5. `tool`: Tool outputs.

## Invariants
- **Append-Only**: Never mutate previous items.
- **Stable Ordering**: Tool definitions are sorted by `(type, name)` before hashing.
