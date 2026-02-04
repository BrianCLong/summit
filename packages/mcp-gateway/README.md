# Summit MCP Gateway

**Status:** ARCHITECTURAL SIGNAL / STUB

This package represents the architectural commitment to the **Model Context Protocol (MCP)** as the primary integration layer for Summit Agents.

## Purpose

The MCP Gateway acts as a secure proxy between Summit Agents and external MCP Servers (e.g., GitHub, Slack, Filesystem).

## Responsibilities

1.  **Protocol Translation:** Standardizes JSON-RPC messages.
2.  **Governance Enforcement:** Applies `policies/security/mcp_governance.rego` to every tool invocation.
3.  **Discovery:** Maintains a registry of available MCP servers.

## Future Implementation

This module will eventually host the connection logic currently scattered in `ToolbusService`.
