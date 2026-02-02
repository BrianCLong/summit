# Summit Model Context Protocol (MCP) Contract

**Status:** authoritative
**Version:** 1.0.0
**Owner:** @jules (Release Captain)

## Overview

This document defines the authoritative contract for all MCP (Model Context Protocol) interactions within the Summit platform. It serves as the single source of truth for tool definitions, resource access, and execution constraints.

## Core Principles

1.  **Deterministic Identity:** Every tool and resource must have a unique, versioned ID.
2.  **Explicit Permissions:** Access capabilities must be declared upfront.
3.  **Traceability:** All executions must be linked to a `trace_id` and `evidence_id`.
4.  **Security First:** No execution without policy validation.

## Tool Definition Standard

All MCP tools exposed by Summit services must conform to the `schemas/mcp/tool.schema.json` schema.

### Required Fields

*   `tool_id`: Unique identifier (e.g., `summit.github.create_issue`).
*   `version`: Semantic version of the tool interface.
*   `permissions`: Array of required permission scopes (e.g., `["repo:write", "issue:create"]`).
*   `description`: Clear, concise description of the tool's purpose.
*   `inputSchema`: JSON Schema defining the expected input arguments.

### Execution Constraints

*   **Timeouts:** All tools must specify a maximum execution time. Default is 30s.
*   **Filesystem:** Tools interacting with the filesystem must be sandboxed to allowed directories.
*   **Network:** Outbound network calls must be allow-listed.

## Resource Definition Standard

All MCP resources exposed by Summit services must conform to the `schemas/mcp/resource.schema.json` schema.

### Required Fields

*   `resource_id`: Unique identifier (e.g., `summit.logs.error_stream`).
*   `uri`: The URI to access the resource.
*   `mimeType`: The MIME type of the resource content.
*   `access`: Access level (`read-only` or `read-write`).

## Evidence Hooks

To support Summit's governance model, all MCP server implementations must support the following context parameters:

*   `trace_id`: The distributed trace ID for the request.
*   `evidence_id`: The ID of the evidence bundle associated with the operation.

## Validation

This contract is enforced by `scripts/ci/validate_mcp_contract.mjs`. All changes to tool or resource definitions must pass validation.
