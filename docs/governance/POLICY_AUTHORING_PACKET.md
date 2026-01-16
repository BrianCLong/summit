# Policy Authoring & Change Management Packet

This document defines the system for Runtime Governance Enforcement, ensuring policy changes are safe, auditable, and automatable.

## A) Policy Structure

The policy system is file-based, located in `docs/governance/policies/`.

| File | Purpose | Default Behavior |
|------|---------|------------------|
| `policy_version.txt` | Defines the current version of the policy set (SemVer). | N/A |
| `runtime_governance.yml` | Core runtime rules (access control, data sovereignty, etc.). | Fail Closed (Action: DENY) |
| `kill_switch.yml` | Configuration for emergency overrides and circuit breakers. | Off (System is live) |
| `tenant_isolation.yml` | Rules defining tenant boundaries and isolation strategies. | Strict Separation |
| `break_glass.yml` | Procedures and roles allowed to bypass governance in emergencies. | Deny All |

### Composition & Hashing
*   **Composition**: Policies are additive. If *any* policy denies an action, it is denied.
*   **Hashing**: A single "Global Policy Hash" is calculated by:
    1.  Sorting file names alphabetically.
    2.  Concatenating `filename:content` for all files.
    3.  Computing SHA-256 of the result.
    This hash uniquely identifies the governance state for any commit.

## B) Policy Schema & Validation

Policies are defined in YAML.

### Validator: `scripts/ci/validate_runtime_policy.mjs`
This script runs in CI to:
1.  **Validate Schema**:
    *   **Required Fields**: `id`, `description`.
    *   **Forbidden Fields**: `allow_all`, `bypass` (to prevent backdoor configurations).
2.  **Compute Hash**: Generates the SHA-256 Global Policy Hash.
3.  **Generate Artifacts**:
    *   `artifacts/governance/policy/<sha>/policy_hash.txt`
    *   `artifacts/governance/policy/<sha>/report.json` (Validation details)
    *   `artifacts/governance/policy/<sha>/stamp.json` (Approval metadata)

## C) Change Management Workflow

All policy changes must go through a dedicated PR workflow.

1.  **Workflow**:
    *   Modify files in `docs/governance/policies/`.
    *   Update `policy_version.txt` (bump version).
    *   PR Title must be prefixed with `[POLICY]`.

2.  **Required Gates**:
    *   **Validation**: `validate_runtime_policy.mjs` must pass.
    *   **Review**: Requires approval from `governance-stewards` team.
    *   **Verification**: A "dry-run" or "simulation" job (if available) should run to assess impact.

3.  **Artifacts**:
    *   The PR build must produce the verification artifacts in the `artifacts/` directory.

## D) Staged Rollout Strategy

To introduce new restrictive policies safely:

1.  **Warn-Only Mode**:
    *   Set `action: WARN` in the policy definition.
    *   Deploy and monitor logs for `PolicyWarning` events.
    *   Assess impact duration (e.g., 24-48 hours).

2.  **Time-Bounded Exemptions**:
    *   Use `expiration` field in rules (if supported) or comment-based expiry for temporary allowlists.
    *   Example: `valid_until: "2023-12-31"` (requires schema support).

3.  **Fail-Closed Transition**:
    *   Once impact is zero or acceptable, change `action: WARN` to `action: DENY`.

## E) Emergency Controls

### Kill Switch (`kill_switch.yml`)
*   **Relation**: The kill switch acts as a global override that takes precedence over standard policies.
*   **Implementation**: Controlled by `KillSwitchService` and feature flags.
*   **Audit**: Activation events are logged to the immutable audit log with `severity: CRITICAL`.

### Break Glass (`break_glass.yml`)
*   **Who**: Only users with `super_admin` role or specific `break_glass` permission.
*   **Conditions**: System outage, security breach, or imminent data loss.
*   **Revocation**:
    *   Emergency access is automatically revoked after `max_duration_minutes` (default 60).
    *   Requires a "Post-Incident Review" to re-enable standard access if locked out.

## F) Implementation Work Plan

| Issue Title | Scope | Acceptance Criteria | Verification | Artifacts |
|-------------|-------|---------------------|--------------|-----------|
| **1. Implement Policy Loader Service** | In | `PolicyEngine` loads YAML files from disk at startup. | Unit tests loading valid/invalid YAMLs. | N/A |
| **2. Integrate Validation in CI** | In | GitHub Workflow runs `validate_runtime_policy.mjs` on PRs. | PR fails if `policy_version.txt` is missing. | `policy_hash.txt` in CI artifacts |
| **3. Implement "Warn" Action Support** | In | `PolicyEngine` supports `WARN` action, logging without blocking. | Log check for "Policy Warning". | Logs |
| **4. Connect Kill Switch to Policy Config** | In | `KillSwitchService` reads `kill_switch.yml` for allowed features. | Toggle kill switch and verify config compliance. | N/A |
| **5. Add Tenant Isolation Rules** | In | Middleware enforces `tenant_isolation.yml` rules. | Request from Tenant A to Tenant B fails. | N/A |
| **6. Build Policy Dashboard** | Out | UI to view active policy version and rules. | N/A | N/A |
