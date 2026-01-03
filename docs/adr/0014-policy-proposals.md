# ADR-014: Policy Proposal Engine V1

## Status
Accepted

## Context
As the platform scales, manual policy tuning becomes risky and slow. However, automated policy application ("auto-remediation") carries unacceptable risks of service disruption or privilege escalation. We need a middle ground: a system that generates high-fidelity, verified, and safe policy change proposals that operators can review and apply.

## Decision
We will implement a "Policy Proposal Engine" with the following strict constraints:

1.  **Proposals Only**: The system MUST NOT apply changes automatically. Its output is a PR-ready bundle (JSON + Patch + Rollback).
2.  **Monotonic Safety**: The engine generally only supports "tightening" operations (e.g., adding denies, enforcing guardrails). Any operation that expands access (e.g., removing a deny) is explicitly denylisted or requires high-level override flags (which are out of scope for V1).
3.  **Allowlist Transforms**: Only a specific set of code-defined transformations are allowed. Generic "apply this JSON patch" requests are rejected.
4.  **Simulation Gating**: No proposal is generated unless it passes a policy simulation against a reference fixture.
5.  **Deterministic Output**: The same inputs (signals) must produce the exact same proposal ID and content (ignoring timestamps).

## Consequences
*   **Safety**: Reduces the risk of accidental breakage or security regressions.
*   **Auditability**: Every proposal has a complete evidence trail.
*   **Speed**: Operators get a "ready to merge" PR rather than starting from scratch.
*   **Complexity**: Adds a new subsystem (`server/src/policy/proposals/`) that needs maintenance.

## Technical Design
*   **Location**: `server/src/policy/proposals/`
*   **Schema**: Versioned JSON schema using Zod.
*   **Engine**: Typescript-based, stateless (except for reading fixtures).
*   **Inputs**: Normalized "signals" (drift events, operator intent).
*   **Outputs**: "Proposal Bundle" (metadata, patch, rollback, evidence).
