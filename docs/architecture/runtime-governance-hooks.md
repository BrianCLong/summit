# Runtime Governance Hooks

This document defines the architectural integration points where governance policy is enforced, monitored, and audited at runtime. These hooks ensure that static policies become dynamic, enforceable controls.

## Hook 1: Immutable Decision Audit
*   **Location:** `server/src/autonomous/policy-engine.ts`
*   **Method:** `logPolicyDecision` (called within `evaluate`)
*   **Signal Emitted:** `policy_decision_made`
*   **Evidence Sink:** `audit_logs` (Structured JSON Log)
*   **Auditability:**
    *   Records `subject` (who), `action` (what), `resource` (on what), and `decision` (result + reason).
    *   Includes `context.autonomy` level to track agent independence.
    *   Maps directly to **GRC Audit Trail** requirements.

## Hook 2: Real-Time Risk Telemetry
*   **Location:** `server/src/autonomous/policy-engine.ts`
*   **Method:** `calculateRiskScore`
*   **Signal Emitted:** `risk_assessment_computed`
*   **Evidence Sink:** `drift_metrics` / `risk_telemetry`
*   **Auditability:**
    *   Captures the calculated risk score (0-100) for every operation *before* execution.
    *   Allows detection of "Risk Drift" (e.g., increasing frequency of high-risk actions).
    *   Supports **RT-001 Runtime Bias/Drift Monitoring**.

## Hook 3: Human-in-the-Loop Enforcement
*   **Location:** `server/src/autonomous/policy-engine.ts`
*   **Method:** `requiresApproval`
*   **Signal Emitted:** `approval_required`
*   **Evidence Sink:** `human_review_queue` / `intervention_events`
*   **Auditability:**
    *   Blocks execution flow when risk exceeds threshold or autonomy is too high for the context (e.g., Production).
    *   Generates a mandatory "Approval Artifact" that must be signed before the action proceeds.
    *   Enforces **EU AI Act Article 14 (Human Oversight)**.
