# Threat Model: Agent Control Plane

## Scope

- Agent registry
- Policy decision point
- Deterministic routing
- Graph context compiler

## Top threats and controls

| Threat | Impact | Control |
| --- | --- | --- |
| Agent sprawl | Unauthorized automation | Registry + policy gate |
| Tool misuse | Data breach | Tool allowlist and deny fixtures |
| Prompt injection | Workflow compromise | Graph policy trim and context compaction |
| Non-determinism in high-risk routing | Unsafe execution | Deterministic sorting and replay tests |

## Runtime controls

- Deny-by-default policy
- Approval gate for high-risk scopes
- Evidence artifacts (`report`, `metrics`, `stamp`, `index`)
