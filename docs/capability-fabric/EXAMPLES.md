# Capability Fabric Examples

## MCP Invoke

```yaml
capability_id: maestro.mcp.invoke
name: Invoke MCP tool
business_domain: orchestration
allowed_identities:
  - mcp:invoke
operations:
  - exec
```

## MCP Session Create

```yaml
capability_id: maestro.mcp.sessions.create
name: Create MCP session
business_domain: orchestration
allowed_identities:
  - mcp:session
operations:
  - write
```

## Maestro Runs Read

```yaml
capability_id: maestro.runs.read
name: Read Maestro runs
business_domain: orchestration
allowed_identities:
  - run_maestro
operations:
  - read
```
