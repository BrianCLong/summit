# MCP Threat Model & Security Controls

## Introduction

The adoption of the Model Context Protocol (MCP) introduces a new paradigm where agents dynamically discover and invoke tools. While this increases capability, it also expands the attack surface. This document analyzes the threats inherent in the MCP architecture and defines the controls required to mitigate them.

## Trust Boundaries

1.  **The Agent (Untrusted/Semi-Trusted):** The LLM or automated script driving the interaction. It may be hallucinating, prompt-injected, or compromised.
2.  **The MCP Server (Trusted Resource):** The bridge to internal data and systems. It must assume all inputs are potentially malicious.
3.  **The Runtime (Trusted Broker):** The `mcp-runtime` that mediates discovery and message passing. It enforces policy.
4.  **The User (Trusted Authority):** The human operator who approves sensitive actions.

## Attack Vectors & Trees

### 1. Malicious Tool Execution (RCE)
- **Threat:** An agent is tricked (via prompt injection) into calling a tool with malicious arguments (e.g., `execute_shell("rm -rf /")`).
- **Mitigation:**
    - **No Shell Access:** Avoid generic "run command" tools.
    - **Input Validation:** Strict Zod schemas for all tool arguments.
    - **Human Approval:** Require explicit user confirmation for side-effecting tools.

### 2. Data Exfiltration via Context
- **Threat:** A compromised MCP server returns sensitive data (PII, secrets) in the context, which the agent then sends to an external attacker.
- **Mitigation:**
    - **Secret Redaction:** Runtime must scan context for regex patterns of known secrets.
    - **Egress filtering:** Agents should not have arbitrary internet access.
    - **Least Privilege:** Servers only expose data required for the specific task.

### 3. Server Impersonation
- **Threat:** A malicious process registers as a valid MCP server (e.g., "auth-service") to steal credentials.
- **Mitigation:**
    - **Registry Allowlist:** Only signed/approved servers can register with the runtime.
    - **PID verification:** Runtime verifies the process identity of local servers.

## Security Controls

| ID | Control | Description | Owner |
|---|---|---|---|
| MCP-SEC-01 | **Schema Validation** | All inputs/outputs must match strict JSON schemas. | Runtime |
| MCP-SEC-02 | **Approval Prompts** | "High Risk" tools must trigger a blocking user prompt. | Runtime |
| MCP-SEC-03 | **Audit Logging** | All tool calls (inputs+outputs) are logged to a tamper-evident stream. | Security |
| MCP-SEC-04 | **Context Sanitization** | Automatic redaction of API keys/tokens from context. | Context Kit |

## Required Logging

For every interaction, the following must be logged:
- `timestamp`
- `actor_id`
- `server_name`
- `tool_name`
- `input_hash` (for integrity)
- `decision` (Allowed/Denied/Approved)
