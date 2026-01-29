# Agent Runtime Governance

**Version:** 1.0
**Status:** Active
**Owner:** Agent Systems / Governance

This document outlines the controls and artifacts required to govern AI agents during execution.

## 1. Agent-Runtime Controls

### Tool-Call Policy Pre-flight
Before an agent can execute a tool call (e.g., querying a database, searching the web), the runtime must perform a "pre-flight" check against the governance engine.
*   **Action**: `AGENT_TOOL_CALL`.
*   **Enforcement**: The `MaestroService` intercepts the tool request and evaluates it against OPA.
*   **Constraint**: If the verdict is not `ALLOW`, the tool call is blocked and a `SafetyViolation` is recorded.

### Reasoning-Path Integrity Check
Ensures that the agent's internal "thought process" doesn't deviate into prohibited domains.
*   **Logic**: The runtime periodically samples the agent's reasoning tokens and evaluates them for "meta-violations" (e.g., attempting to jailbreak its own constraints).
*   **Enforcement**: A `CritiqueAgent` monitors the primary agent's log and can trigger a "Panic Kill-switch" if a violation is detected.

---

## 2. Audit-Grade Artifacts

### Agent Execution Proof (AEP)
A signed, deterministic bundle of evidence that captures everything needed to verify an agent run.
*   **Contents**:
    *   `manifest.json`: List of all inputs, tool calls, and outputs.
    *   `governance_verdicts.json`: Collection of all policy decisions made during the run.
    *   `state_snapshot.bin`: Deterministic snapshot of the execution state.
    *   `signature.sig`: Cryptographic signature covering the entire bundle.
*   **Use Case**: External auditors can ingest the AEP to confirm that the agent operated within bounds without needing access to the live system.

### Governance Consistency Report
A report generated across multiple agent runs or over time to prove that governance decisions are consistent.
*   **Metric**: "Decision Drift" — measures how often similar requests result in different verdicts.
*   **Metric**: "Evidence Coverage" — percentage of decisions linked to valid Evidence IDs.

---

## 3. Implementation Matrix

| Control / Artifact | Runtime Layer | Enforcement Point | Evidence Compatibility |
| :--- | :--- | :--- | :--- |
| **Tool-Call Pre-flight** | Integration | `MaestroService` | Mandatory |
| **Reasoning Integrity** | Cognition | `CritiqueAgent` | High |
| **AEP Bundle** | Persistence | `ProvenanceLedgerV2` | Mandatory |
| **Consistency Report** | Analytics | `GovernanceService` | High |
