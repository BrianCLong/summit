# DISARM Operational Reference

**Standard:** Summit-DISARM-v1
**Basis:** DISARM Red Framework v4

## 1. Objective
To provide a machine-readable, operationally enforced mapping of DISARM tactics to Summit detection signals. This is the **reference implementation** for the industry.

## 2. Operationalization Strategy
Unlike static frameworks, Summit treats DISARM as a runtime schema:
*   **Tactics are Types:** Every tactic (e.g., T0001) is a strong type in the GraphQL schema.
*   **Signals are Proofs:** Detection of a tactic requires cryptographic evidence of specific signals.

## 3. Supported Tactics (v1)
*   **T0001 (Create Inauthentic Accounts):** Detected via `AgentSignalCollector` looking for batch creation velocity > 5 accounts/min.
*   **T0002 (Coordinate Amplification):** Detected via temporal sync analysis of reposts ( < 500ms variance).

## 4. Integration
All DISARM detections must generate a `DisarmEvidence` artifact linked to the immutable ledger.
