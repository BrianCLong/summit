# Data Handling & Privacy (CreateOS Subsumption)

## Never Log Policy

The following data types must NEVER be logged or included in evidence artifacts:
- API Keys, Secrets, Passwords
- Full file contents (unless explicitly allowlisted)
- PII (Personally Identifiable Information)
- Authentication headers or tokens

## MCP Security Controls

1. **Deny-by-Default**: All MCP tools are read-only by default. Write operations require explicit feature flags and path allowlisting.
2. **Sanitization**: All inputs to MCP tools are sanitized to prevent prompt injection and path traversal.
3. **Audit Logging**: All MCP tool calls are logged with actor and purpose, but without sensitive parameters.

## Retention

Evidence artifacts produced by MCP tools follow the standard Summit retention policy (90 days).
Logs are rotated every 14 days.
