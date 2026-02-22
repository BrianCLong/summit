# MCP Transport Skill

## When to use

Reference this skill when implementing STDIO or SSE transports for MCP server communication.

## Inputs

- Transport selection (stdio or sse)
- Max bytes per event
- Session concurrency limits

## Outputs

- Ordered event streams
- Backpressure-safe writes
- Transport health signals

## Failure modes

- Buffered SSE responses (no streaming)
- Event payloads exceeding max bytes
- Session count exceeding tenant limits

## Examples

- Use STDIO for local IDE integrations.
- Use SSE with strict event sizing for dashboards.

## Security notes

- Always enforce tenant session limits on both transports.
- Do not stream unsanitized tool output.
