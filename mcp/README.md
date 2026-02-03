# Model Context Protocol (MCP) in Summit

The Model Context Protocol (MCP) allows AI agents to securely connect to external tools and data sources.

## Governance
All MCP integrations must follow the [MCP Policy](../policy/ai-coding/mcp-policy.md).

## Allowlist
Only tools listed in [allowlist.yaml](./allowlist.yaml) are authorized for use in the Summit platform.

## Security
- **Deny-by-default**: Tools are disabled unless explicitly allowlisted.
- **Audit**: All MCP tool calls are logged in the provenance ledger.
- **Redaction**: Secrets and PII are redacted from MCP tool outputs.
