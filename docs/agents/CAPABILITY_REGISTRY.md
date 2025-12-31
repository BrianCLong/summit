# Agent Capability Registry

This registry defines the authoritative set of capabilities, permissions, and resource classes for Autonomous Agents within the platform.

## 1. Capability Definitions

A capability is a named permission scope that grants an agent access to specific actions and resources.

| Capability ID | Description | Allowed Actions | Resource Class |
| :--- | :--- | :--- | :--- |
| `research.public` | Access to public internet for research | `http.get`, `browser.read` | `external_network` |
| `research.internal` | Access to internal knowledge graph | `graph.read`, `vector.search` | `internal_read` |
| `analysis.code` | Execute code analysis and linting | `code.read`, `linter.run` | `cpu_intensive` |
| `triage.write` | Update issue trackers and status | `ticket.update`, `notification.send` | `write_ops` |
| `ops.remediation` | Execute remediation scripts | `script.exec`, `infra.restart` | `privileged_ops` |
| `agent.coordination` | Delegate tasks to other agents | `agent.delegate`, `agent.ask` | `messaging` |

## 2. Action Permissions

Each specific action requires a capability and is subject to policy enforcement.

### HTTP Actions
*   `http.get`: Allowed for `research.public`. Whitelisted domains only.
*   `http.post`: Restricted to `triage.write` (APIs) or specific configured endpoints.

### Graph Actions
*   `graph.read`: Read-only Cypher queries.
*   `graph.write`: **Requires strict approval.** Not currently assigned to generic capabilities.

### Code Execution
*   `script.exec`: strictly sandboxed. Requires `ops.remediation`.

## 3. Resource Classes

| Class | CPU Limit | Memory Limit | Token Limit (per run) | Network |
| :--- | :--- | :--- | :--- | :--- |
| `default` | 0.5 vCPU | 512 MB | 10k | Deny All |
| `external_network` | 1 vCPU | 1 GB | 50k | Public Allowlist |
| `cpu_intensive` | 2 vCPU | 4 GB | 100k | Deny All |
| `privileged_ops` | 1 vCPU | 1 GB | 20k | Internal VPC Only |

## 4. Governance

*   **Assignment:** Capabilities are assigned at Agent creation time and stored in the `MaestroAgent` record.
*   **Enforcement:** The Maestro Engine enforces capabilities at runtime via the `PolicyEngine`.
*   **Expansion:** New capabilities must be reviewed by the Security Council before being added to this registry.
