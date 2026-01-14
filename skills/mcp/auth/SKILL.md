# MCP Auth & Scopes Skill

## When to use

Use this skill when onboarding a new MCP tenant, assigning scopes, or validating least-privilege policies for MCP tool execution.

## Inputs

- Tenant identifier
- Actor identity
- Requested scopes
- Purpose string

## Outputs

- Scope set that the policy gate will enforce
- Denied scope list (if any)
- Break-glass eligibility assessment

## Failure modes

- Missing or malformed tenant ID
- Scope escalation attempts outside the allowlist
- Break-glass request without time-bounded expiry

## Examples

- Assign `mcp:query:readonly` to allow safe query execution for analysts.
- Require `mcp:break-glass` with a 60-minute expiry for emergency overrides.

## Security notes

- Enforce least privilege and deny-by-default on unrecognized scopes.
- Never log raw tokens or credentials in audit trails.
