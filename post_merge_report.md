# Post-Merge Verification Report: `main`

**Date:** $(date -u)
**Head SHA:** $(git rev-parse --short HEAD)
**Status:** 🟢 **Passed** (with latent risks)

## 1. Executive Summary
The `main` branch is technically green, having passed the "CI stabilization" merge. However, local verification revealed **critical policy drift** and **broken evidence contracts** that CI did not catch.
- **Immediate Risk:** `evidence/EVID-NARINT-SMOKE` contained malformed JSON and forbidden timestamps, violating the evidence contract.
- **Root Cause:** The `ci/gates/evidence_contract.sh` script is not enforced in the primary `ci-verify.yml` workflow, allowing malformed evidence to merge.
- **Action:** Fixed the broken evidence and schema locally. Recommended PR includes these fixes and enabling the evidence gate.

## 2. CI Status on `main`
- **Recent Runs:** Inferred green based on merge history.
- **Local Verification:**
    - `ci/gates/evidence_contract.sh`: **FAILED** (initially) -> **PASSED** (after fixes).
    - Failure was due to `evidence/EVID-NARINT-SMOKE/report.json` being a JSON List (expected Dict) and containing timestamps.
    - `evidence/schemas/report.schema.json` was also found to be malformed (concatenated JSON objects).

## 3. Branch Protection & Required Checks
**Drift Detected:** The following checks are defined in policy/docs but mapped inconsistently in CI.

| Check Name (Policy) | Defined In | Status | Notes |
| :--- | :--- | :--- | :--- |
| **CI Core Gate** | `ci-core.yml` | ✅ Match | Primary gate. |
| **GA Evidence Completeness** | `ci-verify.yml` | ✅ Match | Runs `validate_control_evidence.mjs`. |
| **Evidence Contract** | `ci/gates/evidence_contract.sh` | ❌ **Missing** | Script exists but not invoked in `ci-verify`. |
| **Security Scan** | `ci-verify.yml` | ✅ Match | Gitleaks, pnpm audit. |
| **Policy Compliance** | `ci-verify.yml` | ✅ Match | OPA checks. |
| **gate/evidence** | Unknown | ⚠️ Drift | Listed as temporary in `required_checks.todo.md`. |

## 4. Evidence & Attestation Status
- **Presence:** Evidence artifacts exist in `evidence/`.
- **Schema Compliance:** **FAILED** (initially). `evidence/schemas/report.schema.json` contained syntax errors (concatenated JSON). **FIXED**.
- **Determinism:** **FAILED** (initially). `evidence/EVID-NARINT-SMOKE/report.json` contained timestamps. **FIXED** by moving to `stamp.json`.
- **Provenance:** `provenance.json` exists in evidence bundles (verified by `ga-evidence-completeness`).

## 5. Drift & Risk Classification
- **P0 (Blocking):** Broken `report.schema.json` and malformed `EVID-NARINT-SMOKE`. (Fixed in proposed PR)
- **P1 (Latent):** `evidence_contract.sh` is not running in CI. (Recommended follow-up)
- **P2 (Benign):** Naming mismatches in `required_checks.todo.md`.

## 6. Follow-up Actions (PR-Ready)

**PR Title:** fix(evidence): repair malformed schema and smoke test evidence

**Rationale:**
1.  `evidence/schemas/report.schema.json` was invalid JSON (merge conflict artifact).
2.  `evidence/EVID-NARINT-SMOKE/report.json` violated the evidence contract (List vs Dict, timestamps).
3.  Ensures local `ci/gates/evidence_contract.sh` passes.

**Files to Change:**
- `evidence/schemas/report.schema.json` (Correct syntax)
- `evidence/EVID-NARINT-SMOKE/report.json` (Structure fix)
- `evidence/EVID-NARINT-SMOKE/stamp.json` (New file for timestamps)

**Validation:**
```bash
./ci/gates/evidence_contract.sh
# Expected: "All evidence contracts verified."
```
