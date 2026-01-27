# MCP Supply Chain Monitoring

**Status:** Active
**Owner:** Security Council

## Overview

This document outlines the strategy for monitoring the security of the Model Context Protocol (MCP) supply chain. Given the critical role of MCP in agent execution, all dependencies must be vetted and monitored for vulnerabilities.

## Monitoring Strategy

We employ a multi-layered approach:

1.  **Automated Advisory Scanning**: The `scripts/sec/watch_mcp_advisories.ts` script runs in CI to detect known vulnerable versions of MCP-related packages (e.g., `@modelcontextprotocol/sdk`, `git-mcp`).
2.  **Schema Drift Detection**: We monitor for changes in the official MCP schemas to ensure our implementation remains compliant and secure.
3.  **Vendor Security Feeds**: We subscribe to security advisories from MCP maintainers (Anthropic, etc.).

## Incident Response

If a vulnerability is detected:

1.  **Isolate**: The `mcp-gateway` can be configured to block traffic to/from vulnerable tools.
2.  **Patch**: Upgrade the dependency immediately.
3.  **Verify**: Run the full `validate_mcp_contract.mjs` suite.

## Known Advisories

*   **2025-12-XX**: Git MCP Server RCE (Patched in v0.2.0) - Monitored by script.
