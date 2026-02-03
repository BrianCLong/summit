# ECC Interoperability

This document defines how `everything-claude-code` (ECC) packs map into Summit Blueprint Packs.

## Mapping

| ECC Directory | Summit Pack Field | Description |
| --- | --- | --- |
| `agents/` | `agents` | Markdown files for agent personas |
| `skills/` | `skills` | Markdown files for reusable skills |
| `commands/` | `commands` | Markdown files for custom commands |
| `rules/` | `policies` | Markdown files for governing rules |
| `hooks/` | `hooks` | Hook configurations |
| `mcp-configs/` | `tools` | MCP server configurations |

## Governance

All imported packs are subject to Summit's deny-by-default hook policy and context budgeting.
