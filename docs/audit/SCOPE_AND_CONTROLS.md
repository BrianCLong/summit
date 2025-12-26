# Audit Scope & Control Mapping
> **Status**: Draft (Sprint 17 Execution)
> **Last Updated**: 2025-11-20
> **Target Certification**: SOC 2 Type II / HIPAA / GDPR Readiness

## 1. Audit Scope

### In-Scope Systems
The following components are within the boundary of this audit:

| Component | Description | Repository Path |
|-----------|-------------|-----------------|
| **Summit Core Server** | API, Orchestration, Business Logic | `server/` |
| **Summit Web App** | Analyst Console, Admin Panels | `apps/web/` |
| **Audit Service** | Immutable Logging, WORM Storage | `server/src/audit/` |
| **Compliance Service** | GDPR/HIPAA Automation | `server/src/compliance/` |
| **Identity Service** | AuthN/AuthZ, OPA Policy | `server/src/services/AuthService.ts` |
| **Infrastructure** | k8s manifests, Terraform configs | `deploy/`, `kubernetes/` |

### Out-of-Scope Systems
* **External LLM Providers**: OpenAI, Anthropic (governed by vendor risk management).
* **Developer Workstations**: Out of scope for system audit (governed by endpoint policy).
* **Legacy Archives**: Static archives in `archive/` are read-only and out of scope for processing controls.

### Time Window
* **Observation Period**: 2025-11-20 to Present (Continuous Monitoring)

---

## 2. Control Framework Mapping

This section maps abstract control families to concrete Summit implementations and evidence locations.

### CC6.1 - Logical Access Security
* **Control**: Logical access to system resources is restricted to authorized users.
* **Implementation**:
    * OIDC-based Authentication (`AuthService.ts`)
    * OPA-based RBAC/ABAC (`policy/*.rego`)
    * Short-lived JWTs
* **Evidence**:
    * `server/src/services/AuthService.ts` (Code)
    * `policy/main.rego` (Policy)
    * `docs/audit/evidence/access_logs_sample.json` (Runtime Artifact)

### CC6.2 - User Registration
* **Control**: Users are registered and authorized prior to access.
* **Implementation**:
    * Invite-only or Admin-approved signup flow.
    * SCIM provisioning support.
* **Evidence**:
    * `server/src/routes/auth.ts` (Signup Flow)
    * `server/src/services/scim/` (Provisioning)

### CC8.1 - Change Management
* **Control**: Changes to the system are authorized, tested, and approved.
* **Implementation**:
    * Git-based Workflow (PRs required).
    * CI/CD Pipelines (Lint, Test, Security Scan).
    * Branch Protection Rules (simulated/enforced).
* **Evidence**:
    * `.github/workflows/` (CI Defs)
    * `scripts/ci/` (Build Scripts)
    * `docs/audit/evidence/ci_logs_sample.txt` (Execution Log)

### A1.2 - Data Protection (Encryption)
* **Control**: Confidential data is encrypted at rest and in transit.
* **Implementation**:
    * TLS 1.3 for all APIs.
    * Database Encryption (simulated via `pgcrypto` or verified config).
    * Application-level Field Encryption (PII/PHI).
* **Evidence**:
    * `server/src/utils/crypto.ts`
    * `server/src/compliance/HIPAAComplianceService.ts`

### A1.3 - Data Integrity (Audit Logs)
* **Control**: Audit logs are protected from unauthorized modification.
* **Implementation**:
    * WORM Storage Pattern (`WormStorageService.ts`).
    * Hash Chaining (`AuditLogService.ts`).
* **Evidence**:
    * `server/src/audit/worm.ts`
    * `server/src/audit/advanced-audit-system.ts`

---

## 3. Evidence Matrix

| Control Ref | Evidence Type | Source / Command | Storage Location |
|-------------|---------------|------------------|------------------|
| **ACC-01** | Configuration | `cat policy/main.rego` | `evidence/access/opa_policy.rego` |
| **ACC-02** | Runtime Log | `Select * from audit_access_logs limit 10` | `evidence/access/access_log_sample.json` |
| **CHG-01** | CI Config | `.github/workflows/security.yml` | `evidence/change/ci_config.yaml` |
| **CHG-02** | Test Report | `npm test --json` | `evidence/change/test_results.json` |
| **DAT-01** | Schema Def | `cat server/src/db/schema.sql` | `evidence/data/schema.sql` |
| **DAT-02** | Encrypt Check | `ts-node scripts/audit/verify_encryption.ts` | `evidence/data/encryption_verification.txt` |
