# mc-mcp-adapter

This module provides the server and client adapters for the Multi-Cloud Protocol (MCP).

It acts as a gateway to ensure all inbound and outbound tool calls adhere to MC's guardrails, including:
- OPA (Open Policy Agent) simulation
- Residency and purpose checks
- Audit logging

This adapter facilitates interoperability with external agents and tooling while preserving MC's governance and security controls.
