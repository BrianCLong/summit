# Threat Model: Policy Cards v0

## Assets
- **Policy Integrity**: Ensuring the policy executed is the one approved.
- **Enforcement Logic**: Ensuring the runtime actually blocks denied actions.
- **Evidence Chain**: Ensuring audit logs accurately reflect decisions.

## Threats

### 1. Policy Bypass
- **Description**: An agent or user bypasses the enforcement shim to execute a tool directly.
- **Mitigation**:
    - Runtime Shim: `enforceAction` is the single gateway for tool execution.
    - CI Regression Tests: `policy_bypass_attempt_test` verifies blocking.
    - Code Review: Ensure all tool paths wrap `enforceAction`.

### 2. Policy Drift / Tampering
- **Description**: Policy file is modified without approval or runtime uses an old version.
- **Mitigation**:
    - **Canonicalization & Hashing**: Policy hash is computed and logged in `stamp.json`.
    - **CI Gate**: `policy-validate` fails if policy is invalid.
    - **Drift Monitor**: Periodic check of policy hash vs approved baseline.

### 3. Sensitive Data Leakage
- **Description**: Policy enforcement logs sensitive tool inputs/outputs.
- **Mitigation**:
    - **Never-Log Rules**: Policy defines forbidden fields.
    - **Scrubber**: Runtime removes these fields before logging.
    - **Evidence Review**: Automated scan of evidence artifacts for leaks.

### 4. Denial of Service (DoS) via Enforcement Overhead
- **Description**: Complex policy validation slows down agent runtime.
- **Mitigation**:
    - **Performance Benchmarks**: `policy_enforcement_bench` ensures overhead < 5% (or < 0.5ms per op).
    - **Fail-Safe**: If enforcement times out, fail closed (Deny).

## Verification
- Run `npm test` in `packages/agent-runtime` and `packages/policy-cards`.
- Run `scripts/bench/policy_enforcement_bench.ts`.
