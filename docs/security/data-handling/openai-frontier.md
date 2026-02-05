# OpenAI Frontier Security & Data Handling

## Threat Model & Mitigations

| Threat | Mitigation | Gate | Test |
| :--- | :--- | :--- | :--- |
| **Tool Misuse** | Capability-based Allowlists | `PolicyGate` (Runtime) | `test_policy.py` |
| **Data Exfiltration** | Memory Redaction (PII Scrubbing) | `Redactor` (Store) | `test_redaction.py` |
| **Privilege Escalation** | Per-Agent Identity + Scoped Tokens | `AgentIdentity` | `test_policy.py` |
| **Policy Regression** | Golden Policy Fixtures | CI Regression Suite | `test_mws_frontier.py` |

## Data Classification

*   **Public:** Agent Metadata, Policy definitions.
*   **Internal:** Evidence IDs, Tool Usage Logs.
*   **Confidential:** Customer PII (Email, Phone, CC) -> **MUST BE REDACTED** before storage.
*   **Restricted:** Credentials, Secrets -> **NEVER LOG**.

## Auditing

All agent actions produce deterministic Evidence Artifacts (`SUMMIT-FRONTIER:*:*`) which are immutable and machine-verifiable.
