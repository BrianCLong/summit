# MCP Policy Gate Skill

## When to use

Apply this skill when defining or reviewing policy-as-code rules for MCP tool execution, including break-glass flows.

## Inputs

- Tool metadata (risk tier, required scopes)
- Actor scopes
- Declared purpose
- Optional break-glass request

## Outputs

- Allow/deny decision with rationale
- Required scopes checklist
- Evidence log entries

## Failure modes

- Missing risk-tier classification
- Break-glass approval without a time-bounded expiry
- Policy drift between runtime and documentation

## Examples

- Deny `run_query_readonly` without `mcp:query:readonly`.
- Require `mcp:high` for high-risk tools and log policy decisions.

## Security notes

- Policy logic must remain policy-as-code and auditable.
- Use deterministic scope resolution to prevent privilege creep.
