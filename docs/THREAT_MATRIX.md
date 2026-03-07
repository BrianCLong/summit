# Threat Matrix

| Threat Vector                       | Description                                                    | Impact                     | Mitigation Strategy                                                           | Owner                  |
| ----------------------------------- | -------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| **Abuse: Agent Collusion**          | Agents splitting tasks to bypass individual resource limits.   | High (Resource Exhaustion) | Shared budget tracking via `CoordinationBudgetManager`.                       | Engineering (Platform) |
| **Abuse: Prompt Injection**         | Malicious inputs tricking agents into unauthorized actions.    | High (Policy Bypass)       | Input sanitization, policy gates (OPA), constitutional AI checks.             | Security (AI Safety)   |
| **Escalation: Role Juggling**       | Users exploiting role transitions to gain unauthorized access. | High (Unauth Access)       | Strict session validation, audit logging of role changes.                     | Security (Identity)    |
| **Data Poisoning: Graph Injection** | Inserting false nodes/edges to skew analytics.                 | Medium (Data Integrity)    | Provenance tracking, source verification, anomaly detection.                  | Data Science           |
| **Hallucinated Authority**          | Agent claiming authority it doesn't possess.                   | High (Unauth Action)       | Cryptographic signature verification of capabilities.                         | Engineering (Core)     |
| **Silent Failure: Partial Writes**  | Operations failing halfway without rollback or alert.          | Medium (Data Consistency)  | Transactional boundaries, "all-or-nothing" execution, strict error reporting. | Engineering (Core)     |
| **Extension: Malicious Plugin**     | 3rd party extension exfiltrating data.                         | High (Data Leakage)        | Sandboxing (WASM), capability-based permissions.                              | Security (Platform)    |

## In-Scope Threats

- Malicious authorized users (insiders/compromised accounts) attempting abuse.
- External attackers attempting to bypass API controls.
- Adversarial inputs to LLM agents.
- Supply chain attacks via dependencies (mitigated via SBOM/scanning, out of scope for _this_ sprint's active tests but acknowledged).

## Out-of-Scope Threats (Sprint N+3)

- Physical access attacks.
- Social engineering of human support staff.
- Zero-day vulnerabilities in underlying OS/Hypervisor (handled by CSP).
