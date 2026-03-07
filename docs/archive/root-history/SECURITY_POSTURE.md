# Security Posture & Compliance

**Status**: Audit-Ready
**Version**: 1.0

## 1. Threat Model

### Trust Boundaries

- **Public Internet**: Untrusted. All traffic must pass through WAF + Ingress + TLS.
- **DMZ**: API Gateway. Authenticated but heavily throttled.
- **Internal Network**: Trusted but segmented (Zero Trust). Services use mTLS.
- **Data Plane**: Database & Object Storage. Encryption at rest.

### Critical Assets

1.  **Intelligence Graph**: Highly sensitive. Access via ABAC only.
2.  **User Credentials**: Hashed (Argon2) and salted.
3.  **Audit Logs**: Write-only (WORM) storage.

## 2. Compliance Mapping

### SOC 2 Type II

| Control                       | Implementation          | Evidence                             |
| ----------------------------- | ----------------------- | ------------------------------------ |
| **CC6.1** (Logical Access)    | OIDC/SSO + RBAC/OPA     | `policy/` (Rego)                     |
| **CC6.7** (Data Transmission) | TLS 1.3 everywhere      | `infra/helm/summit/values.prod.yaml` |
| **A1.2** (Data Retention)     | 7-year retention policy | `server/src/retention/`              |

### GDPR

- **Right to be Forgotten**: Supported via `/api/privacy/erasure-request`.
- **Data Portability**: JSON export via `/api/provenance/export`.

## 3. Hardening Measures

### Infrastructure

- **Read-Only Root Filesystem**: Enforced on all containers.
- **Non-Root User**: All processes run as UID 1000+.
- **Capabilities Drop**: `ALL` capabilities dropped by default.

### Application

- **Input Validation**: Zod schemas for all API inputs.
- **Output Encoding**: Context-aware encoding to prevent XSS.
- **CSP**: Strict Content Security Policy headers.

## 4. Vulnerability Management

- **Container Scanning**: Trivy scans on every build (`ci-security.yml`).
- **Dependency Scanning**: Dependabot + Snyk.
- **Secrets Detection**: Gitleaks in pre-commit hook.
