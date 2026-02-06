# Runbook: Agent Platform Signals (MCP + Governance)

## Overview
This runbook covers the operation and maintenance of the MCP-first agent platform, including transport, tool catalog, and security policy.

## Monitoring
Run the drift detection script daily:
`scripts/monitoring/2026-02-05-agent-platform-signals-drift.py`

## Procedures

### 1. Rotating MCP Credentials
- Update `secrets/mcp_keys.json` (mock path).
- Restart agent services.

### 2. Adding a New MCP Server
- Add server URL to `summit/config/mcp_servers.yaml` (if applicable).
- Run `summit/mcp/catalog/sync.py` to update catalog.
- Verify `tool_catalog.json` changes.

### 3. Incident Response: Policy Blocks
- Check `artifacts/evidence/security/policy_audit.log.jsonl` for DENY events.
- If legitimate, update allowlist in policy engine config.
