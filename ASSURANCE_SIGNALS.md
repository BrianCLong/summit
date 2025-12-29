# Assurance Signals

This document defines the authoritative assurance signals for Summit. These signals are continuously verified to ensure safety, compliance, isolation, and reliability.

## 1. Safety Invariants

| Signal ID | Guarantee | Source | Frequency | Owner | Severity | Threshold/Measure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-SAFE-001` | **Agent Budget Adherence**: Agents must not exceed defined budget caps. | Runtime Metric (`agent_budget_usage`) | Continuous (Per Request) | AI Safety Team | Critical | Usage < 100% of allocation |
| `SIG-SAFE-002` | **Data Sensitivity**: PII must not be leaked in logs or non-secure channels. | CI Job (`pii-scan`) | Per PR | Security Team | Critical | 0 detected PII leaks |
| `SIG-SAFE-003` | **Prompt Safety**: Prompts must not exhibit jailbreak vulnerabilities. | CI Job (`prompt-safety-eval`) | Per PR | AI Safety Team | High | 0 jailbreak successes |

## 2. Tenant Isolation

| Signal ID | Guarantee | Source | Frequency | Owner | Severity | Threshold/Measure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-ISO-001` | **Data Access Isolation**: Tenants can only access their own data. | Integration Test (`test-isolation`) | Hourly | Platform Team | Critical | 0 cross-tenant leaks in test suite |
| `SIG-ISO-002` | **Resource Quotas**: Tenants cannot exceed their allocated resource quotas. | Runtime Metric (`tenant_resource_usage`) | Continuous | Platform Team | High | Usage <= 100% of quota |

## 3. Policy Enforcement

| Signal ID | Guarantee | Source | Frequency | Owner | Severity | Threshold/Measure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-POL-001` | **OPA Policy Compliance**: All API requests must pass OPA authorization. | Runtime Metric (`opa_decision_allow`) | Continuous | Security Team | Critical | 100% decision coverage |
| `SIG-POL-002` | **Infrastructure Compliance**: Terraform/Helm charts must pass security policies. | CI Job (`policy-check`) | Per PR | DevOps Team | High | 0 policy violations |

## 4. Audit Completeness

| Signal ID | Guarantee | Source | Frequency | Owner | Severity | Threshold/Measure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-AUD-001` | **Audit Log Integrity**: Audit logs must be tamper-evident (chained hashes). | Scheduled Job (`verify-audit-chain`) | Daily | Compliance Team | Critical | 100% valid hash chain |
| `SIG-AUD-002` | **Action Recording**: All critical actions must generate an audit entry. | Integration Test (`test-audit-coverage`) | Hourly | Compliance Team | High | 100% coverage of sensitive actions |

## 5. SLO Compliance

| Signal ID | Guarantee | Source | Frequency | Owner | Severity | Threshold/Measure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-SLO-001` | **API Latency**: p95 latency must be within defined SLOs. | Runtime Metric (`http_request_duration_seconds`) | Continuous | SRE Team | High | p95 < 350ms (Simulated) |
| `SIG-SLO-002` | **Error Rate**: API error rate must be below 1%. | Runtime Metric (`http_requests_errors`) | Continuous | SRE Team | High | Error Rate < 1% |

## Runbook: Responding to Failures

If an assurance signal fails (Status: `FAIL`), the following runbook applies:

1.  **Immediate Response**:
    *   The alerting system will file a GitHub Issue with the label `assurance-failure`.
    *   The "Owner" team listed above is automatically tagged.
    *   For `Critical` severity, the on-call engineer is paged.

2.  **Investigation**:
    *   Check the "Assurance Status" dashboard for the specific failure reason.
    *   Review the associated CI run or metrics dashboard linked in the alert.
    *   Determine if the failure is a **Regression** (code change caused it) or **Drift** (environment/state change).

3.  **Remediation**:
    *   **Regression**: Revert the offending commit immediately.
    *   **Drift**: Execute the specific remediation playbook for the signal (e.g., "Rotate compromised keys", "Scale up resources").

4.  **Verification**:
    *   Manually trigger the `Assurance Verification` workflow in GitHub Actions to confirm the signal has returned to `PASS`.
