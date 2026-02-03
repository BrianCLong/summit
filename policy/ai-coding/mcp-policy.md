# Policy: MCP Tooling and Safety

## Overview
As agents gain access to real-time tools via the Model Context Protocol (MCP), strict guardrails are required to prevent unintended actions.

## Rules
1. **Deny-by-default**: No tool access is permitted unless the tool is listed in `mcp/allowlist.yaml`.
2. **Read-only preference**: Prefer read-only tool access for initial agent deployments.
3. **Write approval**: Any tool that performs write/modify actions must require a human "go/no-go" approval in the loop as per the [Agent vs. Manual Rubric](./agent-vs-manual.md).
4. **Data Redaction**: Prompts sent to MCP servers must be scanned for secrets. Outputs from MCP servers must be redacted before being stored in long-term logs.

## Threat Model
- **Goal Manipulation**: An agent using a tool to bypass security gates.
- **Tool Abuse**: Over-broad tool permissions leading to data exfiltration.
- **Prompt Injection**: Malicious input from a tool output influencing agent behavior.

## Related
- [Senior Engineer Playbook](../../docs/ai-assist/senior-playbook.md)
