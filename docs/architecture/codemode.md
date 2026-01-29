# Code Mode Architecture

## Overview
Code Mode enables Summit agents to execute sandboxed code instead of sequential tool calls. This reduces context usage and enables complex logic execution within a safe environment.

## Components
1. **Schema Ingest**: Converts MCP tool schemas into thin signatures.
2. **Typegen**: Generates deterministic, type-safe API surfaces.
3. **Sandbox**: Runs code in a restricted environment (default: local, no network).
4. **Proxy**: Routes API calls from the sandbox to the Summit Supervisor (holding auth tokens).
5. **Audit**: Logs all executions with redaction of sensitive data.

## Security Model
* **Deny-by-Default**: Network, FS, and Env access are blocked unless explicitly allowed.
* **Auth Isolation**: Tokens never enter the sandbox.
* **Output Quarantine**: Tool outputs are sanitized/redacted before returning to the agent.
