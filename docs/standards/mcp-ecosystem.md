# Summit MCP Ecosystem Standards

This document describes the standards, positioning, and data handling requirements for the Summit MCP Ecosystem.

## Capabilities
- Summit exposes GraphRAG intelligence through MCP tools.
- Private sub-registry for enterprise use.
- Remote MCP-compatible endpoint for AI clients.

## Interop Mapping
- **Import:** Source (Postgres, Neo4j) -> Mechanism (SQL, Graph queries) -> Summit role
- **Export:** Consumer (OpenAI Responses, LangGraph) -> Interface (Remote MCP Gateway)

## Constraints
- **Do not** replace all internal APIs with MCP.
- **Do not** position as "universal enterprise MCP platform" without production evidence.
- **Do not** log raw bearer tokens or unredacted PII.
