# Security & Compliance Readiness

## OPA Policy Verification
*   **Status:** ✅ PASS
*   **Gate Policy:** `opa/policies/deploy-gate.rego`
*   **Evidence:**
    *   `input.request.privileged` -> Requires `input.reason`
    *   `input.image.registry` -> Must be `ecr.aws.amazon.com/intelgraph/*`
    *   `input.terraform.tags` -> Must include `CostCenter` and `Owner`

## Sealed Secrets
*   **Status:** ✅ READY
*   **Coverage:**
    *   `helm/intelgraph/secrets` contains encrypted secrets.
    *   Master key rotation scheduled for post-GA (Day 2).
*   **Audit:** No plaintext secrets found in git history (verified by `gitleaks`).

## Audit Compliance
*   **Mechanism:** `AdvancedAuditSystem` (Immutable Ledger)
*   **Storage:** WORM S3 Bucket (`terraform/modules/worm_bucket`)
*   **Events Monitored:**
    *   `USER_LOGIN`
    *   `DATA_ACCESS` (PII/Sensitive)
    *   `CONFIGURATION_CHANGE`
    *   `PRIVILEGED_OPERATION`

## DPIA (Data Protection Impact Assessment)
*   **Status:** Verified
*   **Retention:** 90 days for raw logs, 7 years for audit trail.
*   **PII:** Handled via `server/src/pii` with redaction enabled.
