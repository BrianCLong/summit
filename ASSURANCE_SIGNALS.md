# Assurance Signals

This document defines the authoritative assurance signals for Summit. These signals are continuously verified to ensure safety, compliance, isolation, and reliability.

## 1. Safety Invariants

| Signal ID | Guarantee | Source | Frequency | Owner | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-SAFE-001` | **Agent Budget Adherence**: Agents must not exceed defined budget caps. | Runtime Metric (`agent_budget_usage`) | Continuous (Per Request) | AI Safety Team | Critical |
| `SIG-SAFE-002` | **Data Sensitivity**: PII must not be leaked in logs or non-secure channels. | CI Job (`pii-scan`) | Per PR | Security Team | Critical |
| `SIG-SAFE-003` | **Prompt Safety**: Prompts must not exhibit jailbreak vulnerabilities. | CI Job (`prompt-safety-eval`) | Per PR | AI Safety Team | High |

## 2. Tenant Isolation

| Signal ID | Guarantee | Source | Frequency | Owner | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-ISO-001` | **Data Access Isolation**: Tenants can only access their own data. | Integration Test (`test-isolation`) | Hourly | Platform Team | Critical |
| `SIG-ISO-002` | **Resource Quotas**: Tenants cannot exceed their allocated resource quotas. | Runtime Metric (`tenant_resource_usage`) | Continuous | Platform Team | High |

## 3. Policy Enforcement

| Signal ID | Guarantee | Source | Frequency | Owner | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-POL-001` | **OPA Policy Compliance**: All API requests must pass OPA authorization. | Runtime Metric (`opa_decision_allow`) | Continuous | Security Team | Critical |
| `SIG-POL-002` | **Infrastructure Compliance**: Terraform/Helm charts must pass security policies. | CI Job (`policy-check`) | Per PR | DevOps Team | High |

## 4. Audit Completeness

| Signal ID | Guarantee | Source | Frequency | Owner | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-AUD-001` | **Audit Log Integrity**: Audit logs must be tamper-evident (chained hashes). | Scheduled Job (`verify-audit-chain`) | Daily | Compliance Team | Critical |
| `SIG-AUD-002` | **Action Recording**: All critical actions must generate an audit entry. | Integration Test (`test-audit-coverage`) | Hourly | Compliance Team | High |

## 5. SLO Compliance

| Signal ID | Guarantee | Source | Frequency | Owner | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-SLO-001` | **API Latency**: p95 latency must be within defined SLOs. | Runtime Metric (`http_request_duration_seconds`) | Continuous | SRE Team | High |
| `SIG-SLO-002` | **Error Rate**: API error rate must be below 1%. | Runtime Metric (`http_requests_errors`) | Continuous | SRE Team | High |
