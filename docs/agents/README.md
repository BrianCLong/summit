# IntelGraph Agents & Economics

This directory documents the **Budget, Risk, and Operational Framework** for all agents running on the Summit platform, as well as the specific defensive agent implementations.

## Core Governance (Economics & Risk)

Before deploying any agent, review the mandatory governance standards:

*   **[Agent Budgets](./agent-budgets.md)**: Canonical budget dimensions, agent classes (Tier 0-4), and resource limits.
*   **[Risk Scoring Model](./risk-scoring.md)**: How agent risk is calculated based on files touched, permissions, and scope.
*   **[Budget Enforcement](./budget-enforcement.md)**: Mechanisms for invocation-time checks, runtime throttling, and kill switches.
*   **[Telemetry & Audit](./agent-telemetry.md)**: Required metrics, audit logs, and anomaly detection schemas.
*   **[Agent Registry v0](./AGENT_REGISTRY_V0.md)**: Canonical registry of agent definitions, validation rules, and CLI usage.

---

## Agent Roster (Defensive Scope)

Specific implementations of the seven defensive agents:

- **Singlaub**: Field Resilience & Continuity (degraded comms, lawful logistics)
- **LeMay**: Strategic Overwatch & Crisis Response (escalation, rollback, comms)
- **Angleton**: Counter‑Deception & Data Integrity (trust scores, quarantine)
- **Budanov**: Adversary Mapping (OSINT/legal, ambiguity tracking)
- **Wolf**: Long‑Term Risk Insight (drift/novelty, stakeholder signals)
- **Harel**: Threat Network Disruption (protective ops, case bundles)
- **Gehlen**: Telemetry & Peer Capability Analysis (comparative insights)

---

## Operational Resources

*   **Guardrails**: Anonymization, Zero-trust (ABAC), Provenance bundles.
*   **Feature Flags**: Enable/disable per agent via env `FEATURE_AGENT_{NAME}`.
*   **Prompts**:
    *   [Link Analysis Canvas Orchestrator](./link-analysis-canvas-master-prompt.md)
    *   [Agent Variant Superprompts](./variants/README.md) (Claude, Codex, Jules, etc.)
