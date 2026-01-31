# MCP Governance Model

**Status:** Draft
**Owner:** Security Council

## Overview

This document outlines the governance model for the Model Context Protocol (MCP) integration within Summit. As MCP becomes the standard integration layer, strict governance is required to prevent unauthorized tool execution and data leakage.

## Architecture

The MCP Governance architecture consists of three layers:

1.  **Contract Layer**: Defined in `docs/mcp/MCP_CONTRACT.md`. All tools must adhere to strict schemas.
2.  **Gateway Layer**: Implemented in `server/src/mcp-gateway/`. This is the enforcement point.
3.  **Policy Layer**: Determines access based on user identity, trace context, and tool metadata.

## The MCP Gateway

The Gateway acts as a reverse proxy/broker for all MCP traffic.

### Responsibilities

*   **Authentication**: Verifies the identity of the caller (Agent or User).
*   **Authorization**: Checks if the caller is allowed to execute the requested tool or access the resource.
*   **Audit Logging**: Records every interaction with a `trace_id` and `evidence_id`.
*   **Rate Limiting**: Protects downstream services from agent loops.

## Policy Enforcement

Policies are defined in code (initially) and will migrate to OPA (Open Policy Agent).

### Default Policy
*   **Deny All**: By default, no tool execution is allowed.
*   **Allow-List**: Specific high-trust tools are allow-listed for specific roles.

## Audit Strategy

All MCP interactions generate an audit event containing:
*   Timestamp
*   User/Agent ID
*   Trace ID
*   Tool/Resource ID
*   Action (Execute/Read)
*   Decision (Allow/Deny)

These logs are shipped to the central SIEM for analysis.
