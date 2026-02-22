# Copilot SDK + MCP Integration Standard (2026-01)

## Import/Export Matrix

### Imports
*   **MCP Spec Concepts:** Servers, tools/resources/prompts, transport options (stdio/http) -> from [Model Context Protocol](https://modelcontextprotocol.io).
*   **Copilot SDK:** Optional agent runtime backend (preview).

### Exports
*   **Summit MCP Tool Catalog:** Normalized schema with stable hashing.
*   **Summit Policy Decisions:** Deterministic logs of allowed/denied actions.
*   **Summit Conformance Report:** JSON format for conformance probe results.

## Non-goals
*   No "full parity" with Copilot SDK.
*   No remote MCP server execution by default.
*   No automatic credential wiring.

## Evidence ID Pattern
`EVIDENCE_ID = "summit.mcp.<slug>.<gate>.<sha256(manifest+policy)[:12]>"`
