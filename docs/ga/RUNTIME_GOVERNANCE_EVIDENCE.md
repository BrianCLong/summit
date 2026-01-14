# Runtime Governance Evidence & Verification

This document outlines the evidence artifacts produced by the Runtime Governance Enforcement system and how to verify them.

## Evidence Items

### 1. Governance Verdict Schema (`governance_verdict_schema_json`)
- **Description:** A JSON Schema definition derived from the TypeScript `GovernanceVerdict` type.
- **Verification:** Ensure the file contains a valid JSON schema with `definitions` and `type` fields.
- **Why:** Guarantees that downstream consumers (e.g., auditors, dashboards) understand the structure of governance verdicts.

### 2. Runtime Governance Contract (`runtime_governance_contract_doc`)
- **Description:** A copy of the `docs/governance/runtime_control_map.md` at the time of build.
- **Verification:** File existence.
- **Why:** Provides a human-readable reference for the controls enforced in this build.

### 3. Boot Snapshot (`runtime_governance_boot_snapshot`)
- **Description:** A JSON snapshot capturing the policy version and kill-switch state at boot time.
- **Verification:** Check `policy_version` matches the expected release tag and `kill_switch_state` is boolean.
- **Why:** Proves that the system booted with the correct configuration.

### 4. Governance Stamp (`runtime_governance_stamp`)
- **Description:** A SHA256 hash or empty file stamped by the CI process after all governance checks pass.
- **Verification:** File existence (and optionally cryptographic verification).
- **Why:** Acts as a seal of approval from the `governance_unified_gate`.

### 5. Tenant Isolation Test Report (`tenant_isolation_test_report`)
- **Description:** JSON output from the tenant isolation test suite (`tests/governance/tenant-isolation.test.ts`).
- **Verification:** `passed` count must equal total scenarios; `failed` must be 0.
- **Why:** Proves that tenant data isolation logic works correctly.

### 6. Kill Switch Test Report (`kill_switch_test_report`)
- **Description:** JSON output from the kill switch test suite.
- **Verification:** `kill_switch_enabled` should result in `requests_blocked` being true.
- **Why:** Proves the emergency stop mechanism is functional.

### 7. Policy Validation Stamp (`policy_validation_stamp`)
- **Description:** A marker file indicating the OPA policy bundle was validated successfully.
- **Verification:** File existence.
- **Why:** Ensures the policy bundle is syntactically and semantically correct.

### 8. Observability Contract (`runtime_governance_observability_contract_doc`)
- **Description:** A copy of the `docs/ops/RUNTIME_GOVERNANCE_PACKET.md`.
- **Verification:** File existence.
- **Why:** Documents the required metrics and logs for operations.

### 9. Governance Metrics Snapshot (`governance_metrics_snapshot`)
- **Description:** A JSON dump of the Prometheus metrics registered by the governance module.
- **Verification:** Check for expected metric names (e.g., `governance_verdict_total`).
- **Why:** Ensures observability hooks are present.

### 10. Drift Reconciliation Report (`drift_reconciliation_report`)
- **Description:** A report detailing any drift detected and reconciled during the release process.
- **Verification:** `drift_detected` boolean.
- **Why:** Provides visibility into infrastructure or configuration drift.

## Manual Verification

To verify the bundle manually:
1. Locate the artifact bundle in the release assets or CI run.
2. Run `node scripts/ga/verify_evidence_map.ts --bundle <path_to_bundle>`.
