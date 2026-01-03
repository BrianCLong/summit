# Policy Proposal Engine (Safe/Governance-Only)

This document describes the **Policy Proposal Engine**, a system designed to generate safe, verifiable, and reversible policy change proposals.

## Core Principle: No Auto-Apply

The engine **NEVER** automatically applies changes. It is a decision support system that produces a PR-ready bundle. An operator must review, approve, and merge the proposal.

## Architecture

1.  **Engine**: Located in `server/src/policy/proposals/`. Stateless logic.
2.  **Schema**: Strict Zod schema defining the Proposal Bundle.
3.  **Transforms**: Allowlisted code functions that generate `Overlay` patches.
4.  **Verification**: Every proposal is simulated against a probe input to ensure **Monotonic Safety** (no privilege expansion).

## Threat Model

*   **Risk**: An attacker triggers the engine to generate a malicious policy that opens access.
*   **Mitigation**:
    *   **Allowlist Only**: The engine accepts specific `ChangeType` enums (e.g., `ENFORCE_GUARDRAIL_DENY`), not generic code or JSON patches.
    *   **Simulation Gate**: The engine internally simulates the proposed bundle against a reference "dangerous" input. If the proposal allows previously denied access, it throws an error and refuses to generate the bundle.
    *   **Human Review**: The output is a JSON file and a readable summary, not an active change.

## Operator Guide: Generating a Proposal

1.  Go to the **Actions** tab in GitHub.
2.  Select **Generate Policy Proposals**.
3.  Choose the target bundle (path to JSON).
4.  Select the **Change Type** (e.g., `ENFORCE_GUARDRAIL_PURPOSE`).
5.  Provide a **Rationale**.
6.  Run the workflow.
7.  Download the `policy-proposal-bundle` artifact.
8.  Review the `metadata.json` and `patch.json`.
9.  Apply the `patch.json` (Overlay) to your target bundle in a new branch.

## Supported Transforms

| Change Type | Description | Safety Claim |
| :--- | :--- | :--- |
| `ENFORCE_GUARDRAIL_PURPOSE` | Sets `requirePurpose: true` in guardrails. | Narrows access by requiring headers. |
| `ENFORCE_GUARDRAIL_DENY` | Sets `defaultDeny: true`. | Monotonic safety (deny by default). |
| `RESTRICT_CROSS_TENANT` | Sets `crossTenant.mode: 'deny'`. | Disables cross-tenant access. |
| `ADD_DENY_RULE` | Adds a high-priority Deny rule. | Explicitly blocks specific actions. |
